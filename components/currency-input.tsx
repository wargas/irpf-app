"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatDecimal } from "@/lib/format";

const MAX_DIGITS = 12;

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  cents: number;
  onCentsChange: (cents: number) => void;
};

export function CurrencyInput({
  cents,
  onCentsChange,
  ...props
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
      >
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="pl-9 text-right tabular-nums"
        value={formatDecimal(cents / 100)}
        onChange={(event) => {
          const digits = event.target.value
            .replace(/\D/g, "")
            .slice(-MAX_DIGITS);
          onCentsChange(Number(digits));
        }}
      />
    </div>
  );
}
