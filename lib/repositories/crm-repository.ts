import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AutomationEvent,
  Customer,
  CustomerId,
  CustomerSite,
  Opportunity,
  QuoteProject,
  QuoteVersionSnapshot,
  SalesProfileId,
} from "@/types/crm";

export const CRM_TABLES = {
  salesProfiles: "sales_profiles",
  customers: "customers",
  customerSites: "customer_sites",
  householdPowerProfiles: "household_power_profiles",
  householdAppliances: "household_appliances",
  visits: "visits",
  opportunities: "opportunities",
  quoteProjects: "quote_projects",
  quoteVersions: "quote_versions",
  quoteInputs: "quote_inputs",
  quoteOutputs: "quote_outputs",
  bomSnapshots: "bom_snapshots",
  financeScenarios: "finance_scenarios",
  activityLogs: "activity_logs",
  automationEvents: "automation_events",
} as const;

type DbClient = SupabaseClient;
type DbRow = Record<string, unknown>;

function textOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" ? value : null;
}

function mapCustomer(row: DbRow): Customer {
  return {
    id: String(row.id),
    orgId: textOrNull(row.org_id),
    ownerUserId: String(row.owner_user_id),
    displayName: String(row.display_name),
    primaryPhone: textOrNull(row.primary_phone),
    primaryEmail: textOrNull(row.primary_email),
    lineId: textOrNull(row.line_id),
    status: String(row.status) as Customer["status"],
    leadSource: textOrNull(row.lead_source),
  };
}

function mapCustomerSite(row: DbRow): CustomerSite {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    ownerUserId: String(row.owner_user_id),
    addressText: textOrNull(row.address_text),
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    utilityProvider: String(row.utility_provider) as CustomerSite["utilityProvider"],
    meterPhase: String(row.meter_phase) as CustomerSite["meterPhase"],
  };
}

function mapOpportunity(row: DbRow): Opportunity {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    ownerUserId: String(row.owner_user_id),
    stage: String(row.stage) as Opportunity["stage"],
    estimatedBudgetTHB: numberOrNull(row.estimated_budget_thb),
    desiredSystemKwp: numberOrNull(row.desired_system_kwp),
    expectedCloseDate: textOrNull(row.expected_close_date),
    priority: String(row.priority) as Opportunity["priority"],
  };
}

function mapQuoteProject(row: DbRow): QuoteProject {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    siteId: textOrNull(row.site_id),
    opportunityId: textOrNull(row.opportunity_id),
    ownerUserId: String(row.owner_user_id),
    title: String(row.title),
    status: String(row.status) as QuoteProject["status"],
  };
}

function mapAutomationEvent(row: DbRow): AutomationEvent {
  return {
    id: String(row.id),
    orgId: textOrNull(row.org_id),
    ownerUserId: textOrNull(row.owner_user_id),
    aggregateType: String(row.aggregate_type) as AutomationEvent["aggregateType"],
    aggregateId: String(row.aggregate_id),
    eventType: String(row.event_type),
    status: String(row.status) as AutomationEvent["status"],
    payload: (row.payload as Record<string, unknown> | null) ?? {},
  };
}

export interface CreateCustomerInput {
  ownerUserId: SalesProfileId;
  orgId?: string | null;
  displayName: string;
  primaryPhone?: string | null;
  primaryEmail?: string | null;
  lineId?: string | null;
  leadSource?: string | null;
}

export interface CreateCustomerSiteInput {
  customerId: CustomerId;
  ownerUserId: SalesProfileId;
  orgId?: string | null;
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  utilityProvider?: "PEA" | "MEA" | "unknown";
  meterPhase?: "1P" | "3P" | "unknown";
}

export interface CreateAutomationEventInput {
  orgId?: string | null;
  ownerUserId: SalesProfileId;
  aggregateType: AutomationEvent["aggregateType"];
  aggregateId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string;
}

export async function createCustomer(client: DbClient, input: CreateCustomerInput) {
  const { data, error } = await client
    .from(CRM_TABLES.customers)
    .insert({
      org_id: input.orgId ?? null,
      owner_user_id: input.ownerUserId,
      display_name: input.displayName,
      primary_phone: input.primaryPhone ?? null,
      primary_email: input.primaryEmail ?? null,
      line_id: input.lineId ?? null,
      lead_source: input.leadSource ?? null,
      status: "lead",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapCustomer(data);
}

export async function createCustomerSite(client: DbClient, input: CreateCustomerSiteInput) {
  const { data, error } = await client
    .from(CRM_TABLES.customerSites)
    .insert({
      org_id: input.orgId ?? null,
      customer_id: input.customerId,
      owner_user_id: input.ownerUserId,
      address_text: input.addressText ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      utility_provider: input.utilityProvider ?? "unknown",
      meter_phase: input.meterPhase ?? "unknown",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapCustomerSite(data);
}

export async function listOwnedCustomers(client: DbClient, ownerUserId: SalesProfileId) {
  const { data, error } = await client
    .from(CRM_TABLES.customers)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as DbRow[]).map(mapCustomer);
}

export async function listOwnedOpportunities(client: DbClient, ownerUserId: SalesProfileId) {
  const { data, error } = await client
    .from(CRM_TABLES.opportunities)
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data as DbRow[]).map(mapOpportunity);
}

export async function createQuoteProject(
  client: DbClient,
  input: Omit<QuoteProject, "id" | "status"> & { orgId?: string | null },
) {
  const { data, error } = await client
    .from(CRM_TABLES.quoteProjects)
    .insert({
      org_id: input.orgId ?? null,
      customer_id: input.customerId,
      site_id: input.siteId,
      opportunity_id: input.opportunityId,
      owner_user_id: input.ownerUserId,
      title: input.title,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapQuoteProject(data);
}

export async function saveQuoteVersionSnapshot(
  client: DbClient,
  snapshot: QuoteVersionSnapshot,
) {
  const { error: versionError } = await client.from(CRM_TABLES.quoteVersions).insert({
    id: snapshot.quoteVersionId,
    org_id: snapshot.orgId ?? null,
    quote_project_id: snapshot.quoteProjectId,
    customer_id: snapshot.customerId,
    owner_user_id: snapshot.ownerUserId,
    version_no: snapshot.versionNo,
    quote_code: snapshot.quoteCode,
    selected_tier_id: snapshot.result.recommendedTier?.id ?? null,
    system_size_wp: snapshot.result.quotedSystemSizeWp,
    sell_price_thb: snapshot.result.suggestedSellPriceTHB,
    finance_adjusted_price_thb: snapshot.result.finance.financeAdjustedPriceTHB,
    annual_generation_kwh: snapshot.result.annualGenerationKWh,
    payback_years: snapshot.result.paybackYears,
    irr_percent: snapshot.result.irrPercent,
    status: "draft",
  });

  if (versionError) {
    throw versionError;
  }

  // Keep quote history immutable. If this grows, move it to a single SQL RPC transaction.
  const [{ error: inputError }, { error: outputError }, { error: bomError }, { error: financeError }] =
    await Promise.all([
      client.from(CRM_TABLES.quoteInputs).insert({
        org_id: snapshot.orgId ?? null,
        quote_version_id: snapshot.quoteVersionId,
        owner_user_id: snapshot.ownerUserId,
        map_selection: snapshot.input.map,
        quote_input: snapshot.input,
      }),
      client.from(CRM_TABLES.quoteOutputs).insert({
        org_id: snapshot.orgId ?? null,
        quote_version_id: snapshot.quoteVersionId,
        owner_user_id: snapshot.ownerUserId,
        quote_result: snapshot.result,
        explanation: snapshot.result.explanation,
        warnings: snapshot.result.warnings,
      }),
      client.from(CRM_TABLES.bomSnapshots).insert({
        org_id: snapshot.orgId ?? null,
        quote_version_id: snapshot.quoteVersionId,
        owner_user_id: snapshot.ownerUserId,
        bom_snapshot: snapshot.bomSnapshot,
        hardware_cost_thb: snapshot.result.hardwareCostTHB,
      }),
      client.from(CRM_TABLES.financeScenarios).insert({
        org_id: snapshot.orgId ?? null,
        quote_version_id: snapshot.quoteVersionId,
        owner_user_id: snapshot.ownerUserId,
        finance_snapshot: snapshot.financeSnapshot,
        monthly_payment_thb: snapshot.result.finance.monthlyPaymentTHB ?? null,
        down_payment_thb: snapshot.result.finance.downPaymentTHB,
      }),
    ]);

  const error = inputError || outputError || bomError || financeError;

  if (error) {
    throw error;
  }
}

export async function createAutomationEvent(client: DbClient, input: CreateAutomationEventInput) {
  const { data, error } = await client
    .from(CRM_TABLES.automationEvents)
    .insert({
      org_id: input.orgId ?? null,
      owner_user_id: input.ownerUserId,
      aggregate_type: input.aggregateType,
      aggregate_id: input.aggregateId,
      event_type: input.eventType,
      payload: input.payload ?? {},
      scheduled_for: input.scheduledFor ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapAutomationEvent(data);
}
