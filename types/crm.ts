import type { QuoteScenarioInput, QuoteScenarioResult } from "@/types/quote";

export type PrimaryId = string;
export type OrganizationId = PrimaryId;
export type SalesProfileId = PrimaryId;
export type CustomerId = PrimaryId;
export type CustomerSiteId = PrimaryId;
export type OpportunityId = PrimaryId;
export type VisitId = PrimaryId;
export type QuoteProjectId = PrimaryId;
export type QuoteVersionId = PrimaryId;
export type AutomationEventId = PrimaryId;

export type SalesRole = "sales_rep" | "sales_manager" | "admin";
export type CustomerStatus = "lead" | "qualified" | "quoted" | "won" | "lost" | "after_sales";
export type OpportunityStage = "new" | "site_survey" | "proposal" | "negotiation" | "won" | "lost";
export type VisitType = "call" | "site_visit" | "online_meeting" | "follow_up" | "after_sales";
export type QuoteStatus = "draft" | "presented" | "accepted" | "rejected" | "expired";
export type AutomationStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

export interface SalesProfile {
  id: SalesProfileId;
  orgId: OrganizationId | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  displayName: string | null;
  role: SalesRole;
  active: boolean;
}

export interface Customer {
  id: CustomerId;
  orgId: OrganizationId | null;
  ownerUserId: SalesProfileId;
  displayName: string;
  primaryPhone: string | null;
  primaryEmail: string | null;
  lineId: string | null;
  status: CustomerStatus;
  leadSource: string | null;
}

export interface CustomerSite {
  id: CustomerSiteId;
  customerId: CustomerId;
  ownerUserId: SalesProfileId;
  addressText: string | null;
  latitude: number | null;
  longitude: number | null;
  utilityProvider: "PEA" | "MEA" | "unknown";
  meterPhase: "1P" | "3P" | "unknown";
}

export interface HouseholdPowerProfile {
  id: PrimaryId;
  customerId: CustomerId;
  siteId: CustomerSiteId | null;
  monthlyBillTHB: number | null;
  monthlyKWh: number | null;
  peakUsageWindow: string | null;
  occupantsCount: number | null;
  notes: string | null;
}

export interface HouseholdAppliance {
  id: PrimaryId;
  powerProfileId: PrimaryId;
  applianceType: string;
  label: string;
  quantity: number;
  ratedPowerW: number | null;
  estimatedHoursPerDay: number | null;
  inverterLoad: boolean;
}

export interface CustomerVisit {
  id: VisitId;
  customerId: CustomerId;
  siteId: CustomerSiteId | null;
  ownerUserId: SalesProfileId;
  visitType: VisitType;
  scheduledAt: string | null;
  completedAt: string | null;
  outcome: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
}

export interface Opportunity {
  id: OpportunityId;
  customerId: CustomerId;
  ownerUserId: SalesProfileId;
  stage: OpportunityStage;
  estimatedBudgetTHB: number | null;
  desiredSystemKwp: number | null;
  expectedCloseDate: string | null;
  priority: "low" | "normal" | "high";
}

export interface QuoteProject {
  id: QuoteProjectId;
  customerId: CustomerId;
  siteId: CustomerSiteId | null;
  opportunityId: OpportunityId | null;
  ownerUserId: SalesProfileId;
  title: string;
  status: QuoteStatus;
}

export interface QuoteVersionSnapshot {
  quoteVersionId: QuoteVersionId;
  quoteProjectId: QuoteProjectId;
  customerId: CustomerId;
  ownerUserId: SalesProfileId;
  orgId?: OrganizationId | null;
  versionNo: number;
  quoteCode: string;
  input: QuoteScenarioInput;
  result: QuoteScenarioResult;
  bomSnapshot: unknown;
  financeSnapshot: unknown;
}

export interface AutomationEvent {
  id: AutomationEventId;
  orgId: OrganizationId | null;
  ownerUserId: SalesProfileId | null;
  aggregateType: "customer" | "opportunity" | "quote" | "visit" | "order" | "service_ticket";
  aggregateId: PrimaryId;
  eventType: string;
  status: AutomationStatus;
  payload: Record<string, unknown>;
}
