"use client";

import { Landmark, ReceiptText, Wallet } from "lucide-react";
import { useAppCopy, useLocaleContext } from "@/components/locale-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import { formatNumber } from "@/lib/utils";
import type { FinanceProductType } from "@/types/finance";

interface FinanceSelectorProps {
  selectedFinanceIds: string[];
  onChange: (ids: string[]) => void;
}

const GROUP_META: Record<FinanceProductType, { icon: typeof Wallet }> = {
  loan: { icon: Landmark },
  installment: { icon: Wallet },
  subsidy: { icon: ReceiptText },
  tax_credit: { icon: ReceiptText },
};

export function FinanceSelector({ selectedFinanceIds, onChange }: FinanceSelectorProps) {
  const copy = useAppCopy();
  const { locale } = useLocaleContext();
  const helperText =
    locale === "zh"
      ? "默认可不改。只有客户明确要贷款、分期或补贴方案时再展开。"
      : locale === "th"
        ? "ใช้ค่าเริ่มต้นได้ เปิดเมื่อผู้ขายต้องเลือกสินเชื่อ ผ่อนชำระ หรือส่วนลดเท่านั้น"
        : "Leave unchanged by default. Open only when the customer needs loan, installment, or incentive options.";
  const selectedText =
    locale === "zh"
      ? `已选择 ${selectedFinanceIds.length} 项`
      : locale === "th"
        ? `เลือกแล้ว ${selectedFinanceIds.length} รายการ`
        : `${selectedFinanceIds.length} selected`;

  const toggle = (id: string) => {
    if (selectedFinanceIds.includes(id)) {
      onChange(selectedFinanceIds.filter((value) => value !== id));
      return;
    }

    onChange([...selectedFinanceIds, id]);
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
            {(Object.keys(GROUP_META) as FinanceProductType[]).map((type) => {
              const group = FINANCE_PRODUCTS.filter((product) => product.type === type);
              if (group.length === 0) {
                return null;
              }

              const Icon = GROUP_META[type].icon;

              return (
                <div key={type} className="rounded-lg border border-border/70 bg-background p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4 text-primary" />
                    {copy.finance.groups[type]}
                  </div>
                  <div className="grid gap-3">
                    {group.map((product) => (
                      <label
                        key={product.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-background p-3"
                      >
                        <Checkbox
                          checked={selectedFinanceIds.includes(product.id)}
                          onCheckedChange={() => toggle(product.id)}
                        />
                        <div className="grid gap-1">
                          <Label className="cursor-pointer text-sm font-semibold">{product.name}</Label>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                            {product.annualRatePercent !== undefined ? (
                              <span className="rounded-full bg-muted px-2 py-1">
                                {formatNumber(product.annualRatePercent, 2)}% p.a.
                              </span>
                            ) : null}
                            {product.termMonths ? (
                              <span className="rounded-full bg-muted px-2 py-1">
                                {product.termMonths} mo
                              </span>
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
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">{product.notes}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
