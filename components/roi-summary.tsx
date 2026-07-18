import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { localizeFinanceWarning } from "@/lib/i18n";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { QuoteScenarioResult } from "@/types/quote";

interface RoiSummaryProps {
  result: QuoteScenarioResult;
}

export function RoiSummary({ result }: RoiSummaryProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const label =
    locale === "zh"
      ? {
          totalInvestment: "总投资",
          monthlyPayment: "贷款月供",
          payback: "回本周期",
          annualSavings: "年节省电费",
          annualGeneration: "年发电量",
          cashflow: "每月现金流",
          benefit: "每月电费收益",
          payment: "每月还款",
          netPrice: "有效成本",
          downPayment: "预计首付",
          loanAmount: "贷款本金",
          selfUse: "自用省电费",
          export: "上网收入",
          taxBenefit: "税务优惠预估",
          subsidy: "直接补贴",
          netMonthly: "月净现金流",
          noLoan: "未选择贷款",
          approvalNote: "贷款为预估，最终以银行审批、抵押物估值、费用和客户资质为准。",
          npv: "净现值（7%）",
          discountedPayback: "折现回本",
          lifetime: "25年净收益",
          totalInterest: "全期利息",
          highestPayment: "最高月供",
          taxPending: "未计入（需应税收入）",
          curtailment: "弃光/未获批余电",
          notSelected: "未选择",
          cashPayment: "现金支付",
          annualRepayment: "首年预计还款",
        }
      : locale === "th"
        ? {
            totalInvestment: "เงินลงทุนรวม",
            monthlyPayment: "ค่างวดต่อเดือน",
            payback: "ระยะคืนทุน",
            annualSavings: "ประหยัดต่อปี",
            annualGeneration: "ผลิตไฟต่อปี",
            cashflow: "กระแสเงินสดรายเดือน",
            benefit: "ประโยชน์ค่าไฟต่อเดือน",
            payment: "ผ่อนต่อเดือน",
            netPrice: "ต้นทุนสุทธิ",
            downPayment: "เงินดาวน์โดยประมาณ",
            loanAmount: "ยอดกู้",
            selfUse: "ประหยัดจากใช้เอง",
            export: "รายได้ขายไฟ",
            taxBenefit: "ประโยชน์ภาษีโดยประมาณ",
            subsidy: "เงินสนับสนุนตรง",
            netMonthly: "เงินสดสุทธิต่อเดือน",
            noLoan: "ไม่ได้เลือกสินเชื่อ",
            approvalNote: "เป็นการประเมินสินเชื่อเบื้องต้น การอนุมัติจริงขึ้นกับธนาคาร หลักประกัน ค่าธรรมเนียม และคุณสมบัติลูกค้า",
            npv: "NPV (7%)",
            discountedPayback: "คืนทุนแบบคิดลด",
            lifetime: "ผลประโยชน์สุทธิ 25 ปี",
            totalInterest: "ดอกเบี้ยรวม",
            highestPayment: "ค่างวดสูงสุด",
            taxPending: "ยังไม่รวม (ต้องกรอกเงินได้สุทธิ)",
            curtailment: "ไฟส่วนเกิน/ถูกจำกัด",
            notSelected: "ไม่ได้เลือก",
            cashPayment: "ชำระเงินสด",
            annualRepayment: "ยอดผ่อนโดยประมาณปีแรก",
          }
        : {
            totalInvestment: "Total investment",
            monthlyPayment: "Loan payment",
            payback: "Payback",
            annualSavings: "Annual savings",
          annualGeneration: "Annual generation",
          cashflow: "Monthly cashflow",
          benefit: "Monthly bill benefit",
          payment: "Monthly payment",
          netPrice: "Effective cost",
          downPayment: "Estimated down payment",
          loanAmount: "Loan principal",
          selfUse: "Self-use savings",
          export: "Export revenue",
          taxBenefit: "Estimated tax benefit",
          subsidy: "Direct subsidy",
          netMonthly: "Net monthly cashflow",
          noLoan: "No loan selected",
          approvalNote: "Loan terms are estimates. Final approval depends on bank review, collateral value, fees, and customer credit profile.",
          npv: "NPV (7%)",
          discountedPayback: "Discounted payback",
          lifetime: "25-year net benefit",
          totalInterest: "Total interest",
          highestPayment: "Highest payment",
          taxPending: "Not included (taxable income required)",
          curtailment: "Curtailed/unapproved surplus",
          notSelected: "Not selected",
          cashPayment: "Cash payment",
          annualRepayment: "Estimated first-year repayment",
        };

  const annualPaymentTHB = result.finance.monthlyPaymentTHB ? result.finance.monthlyPaymentTHB * 12 : 0;
  const monthlySelfUseSavingsTHB = result.annualSelfUseSavingsTHB / 12;
  const monthlyExportRevenueTHB = result.annualExportRevenueTHB / 12;
  const monthlyBenefitTHB = result.annualSavingsTHB / 12;
  const netMonthlyCashflowTHB = monthlyBenefitTHB - (result.finance.monthlyPaymentTHB || 0);
  const maxBarValue = Math.max(monthlyBenefitTHB, result.finance.monthlyPaymentTHB || 0, 1);
  const monthlySavingsWidth = `${Math.max(8, (monthlyBenefitTHB / maxBarValue) * 100)}%`;
  const monthlyPaymentWidth = `${Math.max(result.finance.monthlyPaymentTHB ? 8 : 0, ((result.finance.monthlyPaymentTHB || 0) / maxBarValue) * 100)}%`;
  const taxDeductionSelected = result.finance.appliedProducts.some(
    (product) => product.type === "tax_deduction" || product.type === "tax_credit",
  );

  return (
    <Card className="overflow-hidden border-slate-950 bg-slate-950 text-white">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{copy.roi.title}</CardTitle>
          </div>
          <Badge variant="secondary">{result.recommendedTier?.id || copy.roi.noPackage}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <HeroMetric label={label.totalInvestment} value={formatCurrency(result.suggestedSellPriceTHB)} tone="light" />
          <HeroMetric
            label={label.monthlyPayment}
            value={result.finance.monthlyPaymentTHB ? formatCurrency(result.finance.monthlyPaymentTHB) : label.noLoan}
            tone="accent"
          />
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{label.payback}</div>
            <div className="mt-2 text-4xl font-semibold tracking-[-0.06em]">
              {result.paybackYears !== null ? `${formatNumber(result.paybackYears, 1)}y` : "N/A"}
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4 sm:p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{label.annualSavings}</div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{formatCurrency(result.annualSavingsTHB)}</div>
            <div className="mt-1 text-sm text-white/55">{label.annualGeneration}: {formatNumber(result.annualGenerationKWh)} kWh</div>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{label.cashflow}</div>
            <div className="text-sm text-white/65">IRR {result.irrPercent !== null ? formatPercent(result.irrPercent, 1) : "N/A"}</div>
          </div>
          <div className="mt-5 grid gap-4">
            <CashflowBar label={label.benefit} value={formatCurrency(monthlyBenefitTHB)} width={monthlySavingsWidth} tone="bg-emerald-300" />
            <CashflowBar
              label={label.payment}
              value={result.finance.monthlyPaymentTHB ? formatCurrency(result.finance.monthlyPaymentTHB) : label.noLoan}
              width={monthlyPaymentWidth}
              tone="bg-amber-300"
            />
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{label.netMonthly}</div>
              <div className={netMonthlyCashflowTHB >= 0 ? "mt-2 text-3xl font-semibold text-emerald-300" : "mt-2 text-3xl font-semibold text-amber-300"}>
                {formatCurrency(netMonthlyCashflowTHB)}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 text-sm text-white/72">
            <FinanceLine
              label={result.finance.monthlyPaymentTHB ? label.downPayment : label.cashPayment}
              value={formatCurrency(result.finance.downPaymentTHB)}
            />
            <FinanceLine label={label.loanAmount} value={formatCurrency(result.finance.financedPrincipalTHB)} />
            <FinanceLine label={label.netPrice} value={formatCurrency(result.finance.financeAdjustedPriceTHB)} />
            <FinanceLine label={label.selfUse} value={`${formatCurrency(monthlySelfUseSavingsTHB)} / mo`} />
            <FinanceLine label={label.export} value={`${formatCurrency(monthlyExportRevenueTHB)} / mo`} />
            <FinanceLine
              label={label.taxBenefit}
              value={
                !taxDeductionSelected
                  ? label.notSelected
                  : result.finance.taxBenefitConfirmed
                    ? formatCurrency(result.finance.taxCreditTHB)
                    : label.taxPending
              }
            />
            <FinanceLine label={label.subsidy} value={formatCurrency(result.finance.totalSubsidyTHB)} />
            <FinanceLine label={label.npv} value={formatCurrency(result.npvTHB)} />
            <FinanceLine
              label={label.discountedPayback}
              value={result.discountedPaybackYears !== null ? `${formatNumber(result.discountedPaybackYears, 1)}y` : "N/A"}
            />
            <FinanceLine label={label.lifetime} value={formatCurrency(result.lifetimeNetSavingsTHB)} />
            <FinanceLine label={label.totalInterest} value={formatCurrency(result.finance.totalInterestTHB)} />
            {result.finance.highestMonthlyPaymentTHB ? (
              <FinanceLine label={label.highestPayment} value={formatCurrency(result.finance.highestMonthlyPaymentTHB)} />
            ) : null}
            {result.annualCurtailmentKWh > 0 ? (
              <FinanceLine label={label.curtailment} value={`${formatNumber(result.annualCurtailmentKWh)} kWh/yr`} />
            ) : null}
          </div>
          {result.finance.monthlyPaymentTHB ? (
            <p className="mt-4 text-xs leading-5 text-white/45">
              {label.approvalNote}
              {annualPaymentTHB > 0 ? ` ${label.annualRepayment}: ${formatCurrency(annualPaymentTHB)}.` : ""}
            </p>
          ) : null}
          {result.finance.policyWarnings.length > 0 ? (
            <div className="mt-4 grid gap-1 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
              {result.finance.policyWarnings.map((warning) => (
                <p key={warning}>{localizeFinanceWarning(locale, warning)}</p>
              ))}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: "light" | "accent" }) {
  return (
    <div
      className={
        tone === "accent"
          ? "rounded-[1.25rem] border border-emerald-300/35 bg-emerald-300 p-4 text-slate-950 shadow-[0_20px_60px_rgba(16,185,129,0.18)] sm:p-5"
          : "rounded-[1.25rem] border border-white/15 bg-white p-4 text-slate-950 sm:p-5"
      }
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.055em] sm:text-3xl">{value}</div>
    </div>
  );
}

function CashflowBar({ label, value, width, tone }: { label: string; value: string; width: string; tone: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-white/62">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
