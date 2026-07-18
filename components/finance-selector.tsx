"use client";

import { useId, useMemo } from "react";
import { ExternalLink, Landmark, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { normalizeFinanceProductIds } from "@/lib/calc/finance";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { THAILAND_ENERGY_POLICY } from "@/lib/config/thailand-energy-policy";
import { formatNumber } from "@/lib/utils";
import type { FinanceProduct, FinanceProductType } from "@/types/finance";

interface FinanceSelectorProps {
  selectedFinanceIds: string[];
  onChange: (ids: string[]) => void;
  taxableIncomeTHB?: number | null;
  onTaxableIncomeChange?: (value: number | null) => void;
}

const GROUP_META: Record<FinanceProductType, { icon: typeof Wallet }> = {
  loan: { icon: Landmark },
  installment: { icon: Wallet },
  subsidy: { icon: ReceiptText },
  tax_credit: { icon: ReceiptText },
  tax_deduction: { icon: ReceiptText },
};

const FINANCING_TYPES: FinanceProductType[] = ["loan", "installment"];
const INCENTIVE_TYPES: FinanceProductType[] = ["subsidy", "tax_credit", "tax_deduction"];
const FINANCING_PRODUCT_IDS = new Set(
  FINANCE_PRODUCTS.filter((product) => FINANCING_TYPES.includes(product.type)).map((product) => product.id),
);

export function FinanceSelector({
  selectedFinanceIds,
  onChange,
  taxableIncomeTHB,
  onTaxableIncomeChange,
}: FinanceSelectorProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const radioGroupId = useId();
  const normalizedFinanceIds = useMemo(
    () => normalizeFinanceProductIds(selectedFinanceIds),
    [selectedFinanceIds],
  );
  const selectedFinancingId =
    normalizedFinanceIds.find((id) => FINANCING_PRODUCT_IDS.has(id)) ?? null;
  const helperText =
    locale === "zh"
      ? "默认可不改。只有客户明确要贷款、分期或补贴方案时再展开。"
      : locale === "th"
        ? "ใช้ค่าเริ่มต้นได้ เปิดเมื่อผู้ขายต้องเลือกสินเชื่อ ผ่อนชำระ หรือส่วนลดเท่านั้น"
        : "Leave unchanged by default. Open only when the customer needs loan, installment, or incentive options.";
  const labels =
    locale === "zh"
      ? {
          cashDescription: "不使用贷款或分期，按现金价格计算。",
          cashTitle: "现金支付 / 不融资",
          financingHint: "贷款与分期共用一个选择，只能采用其中一项。",
          financingTitle: "贷款或分期（单选）",
          incentivesTitle: "补贴与税惠（可多选）",
          policyTitle: "泰国政策基线",
          policySummary: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} THB/kWh（至 2026-08-31）· 住宅余电 2.20 THB/kWh · 获批出口上限 5 kW AC`,
          taxInput: "应税收入（扣除其他减免后）",
          taxHint: "可选。只有填写后，系统才按泰国累进税率计算实际节税；200,000 THB 不是现金返还。",
          source: "官方来源",
          ftSource: "ERC Ft",
          exportSource: "PEA 住宅余电",
        }
      : locale === "th"
        ? {
            cashDescription: "ไม่ใช้สินเชื่อหรือผ่อนชำระ คำนวณด้วยราคาเงินสด",
            cashTitle: "ชำระเงินสด / ไม่จัดไฟแนนซ์",
            financingHint: "สินเชื่อและแผนผ่อนชำระเลือกได้รวมกันเพียงหนึ่งรายการ",
            financingTitle: "สินเชื่อหรือผ่อนชำระ (เลือกหนึ่งรายการ)",
            incentivesTitle: "เงินสนับสนุนและสิทธิภาษี (เลือกได้หลายรายการ)",
            policyTitle: "ฐานนโยบายประเทศไทย",
            policySummary: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} บาท/kWh (ถึง 31-08-2026) · รับซื้อไฟส่วนเกินบ้าน 2.20 บาท/kWh · ส่งออกที่อนุมัติไม่เกิน 5 kW AC`,
            taxInput: "เงินได้สุทธิที่ต้องเสียภาษี (หลังหักรายการอื่น)",
            taxHint: "ไม่บังคับ ระบบจะคำนวณประโยชน์ภาษีเมื่อกรอกเท่านั้น; 200,000 บาทเป็นวงเงินหักรายได้ ไม่ใช่เงินคืน",
            source: "แหล่งข้อมูลทางการ",
            ftSource: "ERC Ft",
            exportSource: "PEA ไฟฟ้าส่วนเกินบ้าน",
          }
        : {
            cashDescription: "Use the cash price without a loan or installment plan.",
            cashTitle: "Cash / no financing",
            financingHint: "Loans and installment plans share one selection; only one can apply.",
            financingTitle: "Loan or installment (choose one)",
            incentivesTitle: "Subsidies and tax incentives (choose any)",
            policyTitle: "Thailand policy baseline",
            policySummary: `Ft ${THAILAND_ENERGY_POLICY.ft.valueTHBPerKWh.toFixed(4)} THB/kWh (to 2026-08-31) · residential export 2.20 THB/kWh · approved export limit 5 kW AC`,
            taxInput: "Taxable income after other deductions",
            taxHint: "Optional. Tax savings are calculated only when supplied; THB 200,000 is an income deduction, not cash back.",
            source: "Official source",
            ftSource: "ERC Ft",
            exportSource: "PEA residential export",
          };
  const selectedText =
    locale === "zh"
      ? `已选择 ${normalizedFinanceIds.length} 项`
      : locale === "th"
        ? `เลือกแล้ว ${normalizedFinanceIds.length} รายการ`
        : `${normalizedFinanceIds.length} selected`;
  const groupLabel = (type: FinanceProductType) => {
    if (type === "tax_deduction") {
      return locale === "zh" ? "所得税扣除" : locale === "th" ? "การหักลดหย่อนภาษี" : "Income-tax deduction";
    }

    return copy.finance.groups[type];
  };

  const selectFinancingProduct = (id: string | null) => {
    const incentiveIds = normalizedFinanceIds.filter(
      (selectedId) => !FINANCING_PRODUCT_IDS.has(selectedId),
    );
    onChange(normalizeFinanceProductIds(id ? [...incentiveIds, id] : incentiveIds));
  };

  const setIncentiveSelected = (id: string, checked: boolean) => {
    const nextIds = checked
      ? [...normalizedFinanceIds, id]
      : normalizedFinanceIds.filter((selectedId) => selectedId !== id);
    onChange(normalizeFinanceProductIds(nextIds));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.finance.title}</CardTitle>
        <CardDescription>{copy.finance.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <details className="group rounded-lg border border-border/70 bg-muted/20 p-4">
          <summary className="cursor-pointer list-none marker:hidden">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-slate-900">{selectedText}</div>
              <div className="text-sm text-muted-foreground">{helperText}</div>
            </div>
          </summary>

          <div className="mt-4 grid gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-semibold">{labels.policyTitle}</div>
                <div className="mt-1 leading-6 text-emerald-900/80">{labels.policySummary}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <PolicySourceLink href={THAILAND_ENERGY_POLICY.ft.sourceUrl} label={labels.ftSource} />
                  <PolicySourceLink
                    href={THAILAND_ENERGY_POLICY.residentialNetBilling.sourceUrl}
                    label={labels.exportSource}
                  />
                </div>
              </div>
            </div>
            <fieldset
              className="rounded-lg border border-border/70 bg-background p-4"
              aria-describedby={`${radioGroupId}-financing-hint`}
            >
              <legend className="px-1 text-sm font-semibold text-slate-900">
                <span className="inline-flex items-center gap-2">
                  <Wallet className="size-4 text-primary" aria-hidden="true" />
                  {labels.financingTitle}
                </span>
              </legend>
              <p id={`${radioGroupId}-financing-hint`} className="mb-3 text-sm text-muted-foreground">
                {labels.financingHint}
              </p>

              <div className="grid gap-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background p-3">
                  <input
                    type="radio"
                    name={`${radioGroupId}-financing-product`}
                    value=""
                    checked={selectedFinancingId === null}
                    onChange={() => selectFinancingProduct(null)}
                    className="mt-0.5 size-5 shrink-0 accent-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-describedby={`${radioGroupId}-cash-description`}
                  />
                  <span className="grid gap-1">
                    <span className="text-sm font-semibold text-slate-900">{labels.cashTitle}</span>
                    <span id={`${radioGroupId}-cash-description`} className="text-sm leading-6 text-muted-foreground">
                      {labels.cashDescription}
                    </span>
                  </span>
                </label>

                {FINANCING_TYPES.map((type) => {
                  const group = FINANCE_PRODUCTS.filter((product) => product.type === type);
                  if (group.length === 0) {
                    return null;
                  }

                  const Icon = GROUP_META[type].icon;
                  const headingId = `${radioGroupId}-${type}-heading`;

                  return (
                    <section key={type} aria-labelledby={headingId} className="grid gap-3">
                      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Icon className="size-4 text-primary" aria-hidden="true" />
                        {groupLabel(type)}
                      </h3>
                      {group.map((product) => {
                        const detailsId = `${radioGroupId}-${product.id}-details`;

                        return (
                          <div
                            key={product.id}
                            className="grid min-h-11 gap-2 rounded-lg border border-border/70 bg-background p-3"
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="radio"
                                name={`${radioGroupId}-financing-product`}
                                value={product.id}
                                checked={selectedFinancingId === product.id}
                                onChange={() => selectFinancingProduct(product.id)}
                                className="mt-0.5 size-5 shrink-0 accent-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-describedby={detailsId}
                              />
                              <span className="grid min-w-0 gap-1">
                                <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                                <ProductDetails product={product} detailsId={detailsId} />
                              </span>
                            </label>
                            {product.officialSourceUrl ? (
                              <a
                                href={product.officialSourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center gap-1 justify-self-start px-1 text-xs font-semibold text-slate-700 underline underline-offset-4"
                              >
                                {labels.source}
                                <ExternalLink className="size-3" aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>
            </fieldset>

            <div className="text-sm font-semibold text-slate-900">{labels.incentivesTitle}</div>
            {onTaxableIncomeChange ? (
              <div className="rounded-lg border border-border/70 bg-background p-4">
                <Label htmlFor={`${radioGroupId}-taxable-income`} className="text-sm font-semibold text-slate-900">
                  {labels.taxInput}
                </Label>
                <Input
                  id={`${radioGroupId}-taxable-income`}
                  className="mt-2"
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  value={taxableIncomeTHB ?? ""}
                  onChange={(event) => {
                    const nextValue = event.target.value === "" ? null : Number(event.target.value);
                    onTaxableIncomeChange(Number.isFinite(nextValue) ? nextValue : null);
                  }}
                  aria-describedby={`${radioGroupId}-taxable-income-hint`}
                />
                <p id={`${radioGroupId}-taxable-income-hint`} className="mt-2 text-sm leading-6 text-muted-foreground">
                  {labels.taxHint}
                </p>
              </div>
            ) : null}
            {INCENTIVE_TYPES.map((type) => {
              const group = FINANCE_PRODUCTS.filter((product) => product.type === type);
              if (group.length === 0) {
                return null;
              }

              const Icon = GROUP_META[type].icon;

              return (
                <fieldset key={type} className="rounded-lg border border-border/70 bg-background p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <Icon className="size-4 text-primary" aria-hidden="true" />
                      {groupLabel(type)}
                    </span>
                  </legend>
                  <div className="grid gap-3">
                    {group.map((product) => {
                      const checkboxId = `${radioGroupId}-${product.id}`;
                      const detailsId = `${checkboxId}-details`;

                      return (
                        <div
                          key={product.id}
                          className="grid min-h-11 gap-2 rounded-lg border border-border/70 bg-background p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex min-h-11 min-w-11 items-center justify-center">
                              <Checkbox
                                id={checkboxId}
                                checked={normalizedFinanceIds.includes(product.id)}
                                onCheckedChange={(checked) => setIncentiveSelected(product.id, checked === true)}
                                className="size-5"
                                aria-describedby={detailsId}
                              />
                            </div>
                            <Label htmlFor={checkboxId} className="grid min-w-0 flex-1 cursor-pointer gap-1">
                              <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                              <ProductDetails product={product} detailsId={detailsId} />
                            </Label>
                          </div>
                          {product.officialSourceUrl ? (
                            <a
                              href={product.officialSourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-11 items-center gap-1 justify-self-start px-1 text-xs font-semibold text-slate-700 underline underline-offset-4"
                            >
                              {labels.source}
                              <ExternalLink className="size-3" aria-hidden="true" />
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function PolicySourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-emerald-950 underline underline-offset-4"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}

function ProductDetails({ product, detailsId }: { product: FinanceProduct; detailsId: string }) {
  const firstRate = product.rateSchedule?.[0];
  const lastRate = product.rateSchedule?.[product.rateSchedule.length - 1];

  return (
    <span id={detailsId} className="grid gap-1">
      <span className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
        {firstRate ? (
          <span className="rounded-full bg-muted px-2 py-1">
            {firstRate.annualRatePercent === lastRate?.annualRatePercent
              ? `${formatNumber(firstRate.annualRatePercent, 2)}% p.a.`
              : `${formatNumber(firstRate.annualRatePercent, 2)}% → ${formatNumber(lastRate?.annualRatePercent || 0, 2)}%`}
          </span>
        ) : product.annualRatePercent !== undefined ? (
          <span className="rounded-full bg-muted px-2 py-1">
            {formatNumber(product.annualRatePercent, 2)}% p.a.
          </span>
        ) : null}
        {product.termMonths ? (
          <span className="rounded-full bg-muted px-2 py-1">{product.termMonths} mo</span>
        ) : null}
        {product.loanToValueRatio !== undefined ? (
          <span className="rounded-full bg-muted px-2 py-1">
            up to {formatNumber(product.loanToValueRatio * 100, 0)}% financed
          </span>
        ) : null}
        {product.maxSubsidyTHB ? (
          <span className="rounded-full bg-muted px-2 py-1">
            cap {formatNumber(product.maxSubsidyTHB)} THB
          </span>
        ) : null}
        {product.taxBenefitRatePercent ? (
          <span className="rounded-full bg-muted px-2 py-1">
            est. tax value {formatNumber(product.taxBenefitRatePercent, 0)}%
          </span>
        ) : null}
        {product.validTo ? (
          <span className="rounded-full bg-muted px-2 py-1">valid to {product.validTo}</span>
        ) : null}
        {product.customerSegments?.length ? (
          <span className="rounded-full bg-muted px-2 py-1">{product.customerSegments.join(" / ")}</span>
        ) : null}
      </span>
      {product.eligibility ? (
        <span className="text-sm font-normal leading-6 text-muted-foreground">{product.eligibility}</span>
      ) : null}
      {product.notes ? (
        <span className="text-sm font-normal leading-6 text-muted-foreground">{product.notes}</span>
      ) : null}
    </span>
  );
}
