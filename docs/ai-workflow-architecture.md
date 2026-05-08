# KSolar AI Workflow Architecture

## Design Goal

KSolar should be structured so AI can help with sales and operations without becoming a hidden decision-maker.

AI should:

- explain calculations
- summarize customer scenarios
- flag risk
- draft follow-up messages
- prepare proposal text
- route handoff tasks

AI should not:

- silently change BOM
- silently change price
- override Google Solar or engineering assumptions
- approve discounts without an audit trail

## Module Boundaries

### 1. Calculation engine

Current modules:

- `lib/calc.ts`
- `lib/calc/*`
- `lib/config/*`

Responsibility:

- deterministic quote calculation
- typed input and output
- no database dependency
- no AI dependency

AI use:

- read calculation explanations
- summarize why a result changed
- compare quote versions

### 2. Spatial intelligence

Current modules:

- `lib/solar.ts`
- `lib/solar-raster.ts`
- `app/api/solar/*`

Responsibility:

- Google Solar retrieval
- roof match detection
- raster clipping
- flux and shade summaries

AI use:

- explain whether Google Solar is trustworthy for this roof
- identify mismatch reasons
- turn technical warnings into sales-friendly language

### 3. Quote persistence

Future modules:

- `app/api/quotes/*`
- `lib/db/*`
- Supabase tables

Responsibility:

- save quote inputs
- save quote outputs
- save Google Solar payload summaries
- save versioned calculation assumptions

AI use:

- find similar historical quotes
- summarize customer history
- detect unusual quote patterns

### 4. Workflow events

Future table:

- `quote_events`

Event examples:

- `quote.created`
- `quote.updated`
- `quote.google_solar_mismatch`
- `quote.price_changed`
- `quote.bom_changed`
- `quote.sent_to_customer`
- `quote.customer_followup_due`
- `quote.approved`
- `quote.handoff_to_ops`

Responsibility:

- every important state change becomes an event
- events are append-only
- automation reacts to events instead of scraping UI state

AI use:

- generate follow-up task after quote creation
- summarize quote changes before customer call
- flag large Google-vs-KSolar sizing gaps
- draft ops handoff checklist

### 5. AI task layer

Future modules:

- `lib/ai/prompts/*`
- `lib/ai/workflows/*`
- `app/api/ai/*`

Suggested tasks:

- `summarizeQuoteForSales`
- `explainRoofMismatch`
- `draftCustomerMessage`
- `generateProposalNarrative`
- `reviewQuoteRisk`
- `prepareOpsHandoff`

Each task should accept structured input:

- quote result
- calculation explanation
- Google Solar summary
- BOM summary
- customer context

Each task should return structured output:

- `summary`
- `risks`
- `recommendedActions`
- `customerFriendlyText`
- `internalNotes`

## Suggested Workflow Examples

### Sales quote assistant

Trigger:

- quote created or updated

AI output:

- one-paragraph customer explanation
- top 3 talking points
- top 3 caveats
- recommended next step

### Google Solar mismatch assistant

Trigger:

- `googleMatchedRoof` is false
- `deltaKw` exceeds configured threshold

AI output:

- likely cause
- whether to redraw roof
- whether to request engineer review
- plain-language warning for salesperson

### Proposal generator

Trigger:

- salesperson clicks `Generate proposal`

AI output:

- project overview
- system recommendation
- financial summary
- assumptions and disclaimers

Important:

- Generated text should cite calculation values from the quote result.
- Generated text should not invent energy yield or savings.

### Follow-up automation

Trigger:

- quote created and not sent within 24 hours
- customer viewed proposal but no response
- quote revised after customer objection

AI output:

- suggested follow-up message
- task assigned to salesperson

## Data Contract For AI

Use one consolidated payload:

```ts
interface QuoteAIPayload {
  quoteId: string;
  customer?: {
    name?: string;
    address?: string;
  };
  inputs: QuoteScenarioInput;
  result: QuoteScenarioResult;
  solar?: GoogleSolarSummary;
  calculationExplanation: CalculationExplanation[];
  locale: "en" | "zh" | "th";
}
```

The AI layer should never call Excel, never call Google Solar directly, and never recalculate business logic independently.

## Implementation Phases

### v1.0

- No AI runtime required.
- Make calculation explanations clear.
- Save test feedback manually.

### v1.1

- Add accounts and saved quotes.
- Add `quote_events`.
- Add AI-ready structured payload generator.

### v1.2

- Add AI quote summary.
- Add mismatch explanation.
- Add customer follow-up drafts.

### v1.3

- Add proposal PDF generation.
- Add ops handoff workflow.
- Add manager approval and exception review.

## Guardrails

- AI output is advisory.
- Final quote numbers come only from the rule engine.
- Every AI-generated customer-facing message should be editable before sending.
- Every automation should write a `quote_event`.
- High-risk cases should ask for human review.
