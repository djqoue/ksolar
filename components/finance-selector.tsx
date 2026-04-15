"use client";

import { Landmark, ReceiptText, Wallet } from "lucide-react";
import { useAppCopy } from "@/components/locale-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FINANCE_PRODUCTS } from "@/lib/config/finance-products";
import type { FinanceProductType } from "@/types/finance";

interface FinanceSelectorProps {
  selectedFinanceIds: string[];
  onChange: (ids: string[]) => void;
}

const GROUP_META: Record<FinanceProductType, { icon: typeof Wallet; label: string }> = {
  loan: { icon: Landmark, label: "Loans" },
  installment: { icon: Wallet, label: "Installments" },
  subsidy: { icon: ReceiptText, label: "Subsidies" },
  tax_credit: { icon: ReceiptText, label: "Tax benefits" },
};

export function FinanceSelector({ selectedFinanceIds, onChange }: FinanceSelectorProps) {
  const copy = useAppCopy();

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
      <CardContent className="grid gap-4">
        {(Object.keys(GROUP_META) as FinanceProductType[]).map((type) => {
          const group = FINANCE_PRODUCTS.filter((product) => product.type === type);
          if (group.length === 0) {
            return null;
          }

          const Icon = GROUP_META[type].icon;

          return (
            <div key={type} className="rounded-[1.1rem] border border-border/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-4 text-primary" />
                {copy.finance.groups[type]}
              </div>
              <div className="grid gap-3">
                {group.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-border/70 bg-background p-3"
                  >
                    <Checkbox
                      checked={selectedFinanceIds.includes(product.id)}
                      onCheckedChange={() => toggle(product.id)}
                    />
                    <div className="grid gap-1">
                      <Label className="cursor-pointer text-sm font-semibold">{product.name}</Label>
                      <p className="text-sm leading-6 text-muted-foreground">{product.notes}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
