import type { AppLocale } from "@/lib/i18n";
import type {
  CustomerId,
  CustomerSiteId,
  OpportunityId,
  QuoteProjectId,
  QuoteVersionId,
} from "@/types/crm";
import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

export interface SaveQuoteInput {
  customerId: CustomerId;
  quoteProjectId?: QuoteProjectId | null;
  quoteVersionId?: QuoteVersionId | null;
  siteId?: CustomerSiteId | null;
  opportunityId?: OpportunityId | null;
  title?: string;
  input: QuoteScenarioInput;
  /** @deprecated Ignored. The Server Action recalculates the authoritative result from input. */
  result?: QuoteScenarioResult;
  /** @deprecated Ignored. The authoritative BOM comes from the server-side calculation result. */
  bomSnapshot?: unknown;
  /** @deprecated Ignored. The authoritative finance snapshot comes from the server-side calculation result. */
  financeSnapshot?: unknown;
  locale?: AppLocale;
}

export interface SaveQuoteRpcParams {
  p_actor_user_id: string;
  p_quote_project_id: string | null;
  p_quote_version_id: string;
  p_customer_id: string;
  p_site_id: string | null;
  p_opportunity_id: string | null;
  p_title: string | null;
  p_quote_input: Record<string, unknown>;
  p_quote_result: Record<string, unknown>;
  p_bom_snapshot: Record<string, unknown>;
  p_finance_snapshot: Record<string, unknown>;
}

export type SaveQuoteErrorCode =
  | "invalid_input"
  | "not_configured"
  | "unauthenticated"
  | "forbidden"
  | "conflict"
  | "save_failed";

export type SaveQuoteState =
  | {
      status: "success";
      message: string;
      quoteProjectId: QuoteProjectId;
      quoteVersionId: QuoteVersionId;
      quoteCode: string;
    }
  | {
      status: "error";
      code: SaveQuoteErrorCode;
      message: string;
    };
