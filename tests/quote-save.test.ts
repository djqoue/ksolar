import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateQuoteScenario } from "@/lib/calc";
import type { QuoteScenarioInput } from "@/types/quote";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseServiceRoleClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceRoleClient: mocks.createSupabaseServiceRoleClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { saveQuote } from "@/app/(sales)/quote/actions";

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const ACTOR_ID = "44444444-4444-4444-8444-444444444444";
const REVISION_VERSION_ID = "55555555-5555-4555-8555-555555555555";

const quoteInput: QuoteScenarioInput = {
  map: {
    shapes: [],
    grossAreaM2: 120,
    usableAreaFactor: 0.7,
    usableAreaM2: 84,
  },
  topology: { phase: "1P", mode: "ongrid", batteryMode: "none" },
  pricingPresetId: "standard",
  selectedFinanceIds: [],
  ftRateTHBPerKWh: 0,
  selfConsumptionRatio: 0.6,
  exportRateTHBPerKWh: 2.2,
};

const quoteResult = calculateQuoteScenario(quoteInput);

describe("saveQuote server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends one normalized RPC payload and returns serializable quote identifiers", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        quote_project_id: PROJECT_ID,
        quote_version_id: VERSION_ID,
        quote_code: "KS-20260718-2222222222224222-V001",
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ACTOR_ID } },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceRoleClient.mockReturnValue({ rpc });

    const state = await saveQuote({
      customerId: CUSTOMER_ID,
      quoteProjectId: PROJECT_ID,
      quoteVersionId: VERSION_ID,
      title: "  Bangkok home solar  ",
      input: quoteInput,
      result: { ...quoteResult, suggestedSellPriceTHB: 1 },
      bomSnapshot: { clientSupplied: "must be ignored" },
      financeSnapshot: { clientSupplied: "must be ignored" },
      locale: "zh",
    });

    expect(rpc).toHaveBeenCalledWith(
      "save_quote_atomic",
      expect.objectContaining({
        p_actor_user_id: ACTOR_ID,
        p_quote_project_id: PROJECT_ID,
        p_quote_version_id: VERSION_ID,
        p_customer_id: CUSTOMER_ID,
        p_site_id: null,
        p_opportunity_id: null,
        p_title: "Bangkok home solar",
        p_quote_input: expect.objectContaining({ pricingPresetId: "standard" }),
        p_quote_result: expect.objectContaining({
          isViable: true,
          suggestedSellPriceTHB: quoteResult.suggestedSellPriceTHB,
        }),
        p_bom_snapshot: quoteResult.bom,
        p_finance_snapshot: quoteResult.finance,
      }),
    );
    expect(single).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      message: "报价已保存：KS-20260718-2222222222224222-V001",
      quoteProjectId: PROJECT_ID,
      quoteVersionId: VERSION_ID,
      quoteCode: "KS-20260718-2222222222224222-V001",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/crm");
  });

  it("passes an existing project ID so the RPC can append a new immutable version", async () => {
    const rpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          quote_project_id: PROJECT_ID,
          quote_version_id: VERSION_ID,
          quote_code: "KS-20260718-2222222222224222-V002",
        },
        error: null,
      }),
    });

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ACTOR_ID } },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceRoleClient.mockReturnValue({ rpc });

    await saveQuote({
      customerId: CUSTOMER_ID,
      quoteProjectId: PROJECT_ID,
      quoteVersionId: REVISION_VERSION_ID,
      input: quoteInput,
    });

    expect(rpc).toHaveBeenCalledWith(
      "save_quote_atomic",
      expect.objectContaining({
        p_quote_project_id: PROJECT_ID,
        p_quote_version_id: REVISION_VERSION_ID,
      }),
    );
  });

  it("preserves a caller-provided quoteVersionId across retries", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        quote_project_id: PROJECT_ID,
        quote_version_id: VERSION_ID,
        quote_code: "KS-20260718-2222222222224222-V001",
      },
      error: null,
    });
    const rpc = vi.fn().mockReturnValue({ single });

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ACTOR_ID } },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceRoleClient.mockReturnValue({ rpc });

    const request = {
      customerId: CUSTOMER_ID,
      quoteProjectId: PROJECT_ID,
      quoteVersionId: VERSION_ID,
      input: quoteInput,
    };
    const first = await saveQuote(request);
    const retry = await saveQuote(request);

    expect(first).toEqual(retry);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls.map(([, params]) => params.p_quote_version_id)).toEqual([
      VERSION_ID,
      VERSION_ID,
    ]);
  });

  it("rejects malformed or non-viable input before opening a database client", async () => {
    const malformed = await saveQuote({
      customerId: "not-a-uuid",
      input: quoteInput,
    });
    const nonViable = await saveQuote({
      customerId: CUSTOMER_ID,
      input: {
        ...quoteInput,
        map: {
          ...quoteInput.map,
          grossAreaM2: 10,
          usableAreaM2: 7,
        },
      },
    });

    expect(malformed).toMatchObject({ status: "error", code: "invalid_input" });
    expect(nonViable).toMatchObject({ status: "error", code: "invalid_input" });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("returns a clear unauthenticated state without invoking the quote RPC", async () => {
    const rpc = vi.fn();

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      rpc,
    });

    const state = await saveQuote({
      customerId: CUSTOMER_ID,
      input: quoteInput,
      locale: "en",
    });

    expect(state).toEqual({
      status: "error",
      code: "unauthenticated",
      message: "Sign in with a sales account before saving this quote.",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it("does not fall back to the user-scoped client when the service role is missing", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ACTOR_ID } },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceRoleClient.mockReturnValue(null);

    const state = await saveQuote({
      customerId: CUSTOMER_ID,
      input: quoteInput,
      locale: "en",
    });

    expect(state).toEqual({
      status: "error",
      code: "not_configured",
      message: "Supabase is not configured, so this quote cannot be saved.",
    });
  });

  it("maps database ownership failures to a UI-safe forbidden state", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rpc = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42501",
          message: "The selected customer is not owned by this account.",
        },
      }),
    });

    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: ACTOR_ID } },
          error: null,
        }),
      },
    });
    mocks.createSupabaseServiceRoleClient.mockReturnValue({ rpc });

    const state = await saveQuote({
      customerId: CUSTOMER_ID,
      input: quoteInput,
      locale: "en",
    });

    expect(state).toEqual({
      status: "error",
      code: "forbidden",
      message: "This sales account cannot save a quote for the selected customer.",
    });
    consoleError.mockRestore();
  });
});
