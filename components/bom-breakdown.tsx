import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppCopy } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";

interface BomBreakdownProps {
  result: QuoteScenarioResult;
}

export function BomBreakdown({ result }: BomBreakdownProps) {
  const copy = useAppCopy();

  if (!result.bom) {
    return null;
  }

  const categories = Object.entries(result.bom.categoryTotals).filter(([, value]) => value > 0);
  const groupedLineItems = categories.map(([category]) => ({
    category,
    items: result.bom?.lineItems.filter((item) => item.category === category) || [],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.bom.title}</CardTitle>
        <CardDescription>{copy.bom.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="rounded-[1.35rem] border border-slate-950 bg-slate-950 p-5 text-white">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">BOM Cost</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.055em]">{formatCurrency(result.hardwareCostTHB)}</div>
            <div className="mt-3 text-sm leading-6 text-white/62">
              {result.bom.lineItems.length} line items · {categories.length} categories
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.35rem] border border-border/70 bg-background p-5">
              <div className="metric-label">{copy.quote.sellPrice}</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(result.suggestedSellPriceTHB)}</div>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-background p-5">
              <div className="metric-label">{copy.quote.netCustomerPrice}</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(result.finance.financeAdjustedPriceTHB)}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map(([category, value]) => (
            <div key={category} className="rounded-[1.1rem] border border-border/70 bg-background p-4">
              <div className="metric-label">{copy.bom.categories[category as keyof typeof copy.bom.categories] || category}</div>
              <div className="mt-2 text-xl font-semibold">{formatCurrency(value)}</div>
            </div>
          ))}
        </div>

        <Accordion type="single" collapsible className="rounded-[1.25rem] border border-border/70 px-4">
          <AccordionItem value="items" className="border-none">
            <AccordionTrigger>{copy.bom.lineItems}</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3">
                {groupedLineItems.map((group) => (
                  <div key={group.category} className="grid gap-3 rounded-[1.1rem] border border-border/60 p-3">
                    <div className="metric-label">
                      {copy.bom.categories[group.category as keyof typeof copy.bom.categories] || group.category}
                    </div>
                    <div className="grid gap-3">
                      {group.items.map((item) => (
                        <div
                          key={`${item.id}-${item.model}`}
                          className="grid gap-1 rounded-[1rem] border border-border/60 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{item.name}</div>
                            <div className="text-muted-foreground">{item.model}</div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div>{item.quantity} x {formatCurrency(item.unitCostTHB)}</div>
                            <div className="font-semibold">{formatCurrency(item.subtotalTHB)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
