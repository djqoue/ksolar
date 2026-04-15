import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppCopy } from "@/components/locale-provider";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";

interface RoiSummaryProps {
  result: QuoteScenarioResult;
}

export function RoiSummary({ result }: RoiSummaryProps) {
  const copy = useAppCopy();

  return (
    <Card className="overflow-hidden bg-hero-grid">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{copy.roi.title}</CardTitle>
          </div>
          <Badge variant="secondary">{result.recommendedTier?.id || copy.roi.noPackage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.1rem] border border-white/40 bg-white/92 p-5">
            <div className="metric-label">{copy.roi.payback}</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight">
              {result.paybackYears ? `${formatNumber(result.paybackYears, 1)}y` : "N/A"}
            </div>
          </div>
          <div className="rounded-[1.1rem] border border-white/40 bg-white/92 p-5">
            <div className="metric-label">{copy.roi.irr}</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight">
              {result.irrPercent ? formatPercent(result.irrPercent, 1) : "N/A"}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[1.1rem] border border-white/40 bg-white/85 p-4">
            <div className="metric-label">{copy.roi.annualSavings}</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(result.annualSavingsTHB)}</div>
          </div>
          <div className="rounded-[1.1rem] border border-white/40 bg-white/85 p-4">
            <div className="metric-label">{copy.roi.monthlyPayment}</div>
            <div className="mt-2 text-2xl font-semibold">
              {result.finance.monthlyPaymentTHB ? formatCurrency(result.finance.monthlyPaymentTHB) : "N/A"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
