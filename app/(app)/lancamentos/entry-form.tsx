"use client";

import { Check, Copy, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL, formatPercent, MONTHS } from "@/lib/format";
import { calculateMonth } from "@/lib/irpf/calculate";
import {
  OTHER_DEDUCTION_LABELS,
  OTHER_DEDUCTION_TYPES,
  type OtherDeductionType,
} from "@/lib/irpf/deductions";
import type { StoredEntry } from "@/lib/irpf/entries";
import type { MonthlyTaxParams } from "@/lib/irpf/tax-table";
import { deleteMonthlyEntry, saveMonthlyEntry } from "./actions";

const TYPE_ITEMS = OTHER_DEDUCTION_TYPES.map((value) => ({
  value,
  label: OTHER_DEDUCTION_LABELS[value],
}));

type FormState = {
  incomeCents: number;
  officialPensionCents: number;
  dependents: number;
  alimonyCents: number;
  withheldTaxCents: number;
  otherDeductions: {
    key: string;
    type: OtherDeductionType;
    amountCents: number;
  }[];
};

const EMPTY_STATE: FormState = {
  incomeCents: 0,
  officialPensionCents: 0,
  dependents: 0,
  alimonyCents: 0,
  withheldTaxCents: 0,
  otherDeductions: [],
};

function toCents(value: number) {
  return Math.round(value * 100);
}

function toFormState(entry: StoredEntry | undefined): FormState {
  if (!entry) return EMPTY_STATE;

  return {
    incomeCents: toCents(entry.income),
    officialPensionCents: toCents(entry.officialPension),
    dependents: entry.dependents,
    alimonyCents: toCents(entry.alimony),
    withheldTaxCents: toCents(entry.withheldTax),
    otherDeductions: entry.otherDeductions.map((deduction) => ({
      key: crypto.randomUUID(),
      type: deduction.type,
      amountCents: toCents(deduction.amount),
    })),
  };
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-medium tabular-nums" : "tabular-nums"}>
        {value}
      </dd>
    </div>
  );
}

export function EntryForm({
  employmentId,
  month,
  params,
  entry,
  previousEntry,
}: {
  employmentId: string;
  month: number;
  params: MonthlyTaxParams;
  entry: StoredEntry | undefined;
  previousEntry: StoredEntry | undefined;
}) {
  const [form, setForm] = useState(() => toFormState(entry));
  const [status, setStatus] = useState<
    { kind: "saved" } | { kind: "error"; message: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  function update(changes: Partial<FormState>) {
    setForm((current) => ({ ...current, ...changes }));
    setStatus(null);
  }

  function updateDeduction(
    key: string,
    changes: Partial<FormState["otherDeductions"][number]>,
  ) {
    update({
      otherDeductions: form.otherDeductions.map((deduction) =>
        deduction.key === key ? { ...deduction, ...changes } : deduction,
      ),
    });
  }

  const result = useMemo(
    () =>
      calculateMonth(
        {
          income: form.incomeCents / 100,
          officialPension: form.officialPensionCents / 100,
          dependents: form.dependents,
          alimony: form.alimonyCents / 100,
          otherDeductions: form.otherDeductions.map((deduction) => ({
            type: deduction.type,
            amount: deduction.amountCents / 100,
          })),
        },
        params,
      ),
    [form, params],
  );

  function handleSave() {
    if (form.incomeCents === 0) {
      setStatus({ kind: "error", message: "Informe o rendimento do mês." });
      return;
    }
    if (form.otherDeductions.some((deduction) => deduction.amountCents === 0)) {
      setStatus({
        kind: "error",
        message: "Informe o valor de cada dedução ou remova a linha.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const response = await saveMonthlyEntry({
          employmentId,
          month,
          incomeCents: form.incomeCents,
          officialPensionCents: form.officialPensionCents,
          dependents: form.dependents,
          alimonyCents: form.alimonyCents,
          withheldTaxCents: form.withheldTaxCents,
          otherDeductions: form.otherDeductions.map(
            ({ type, amountCents }) => ({ type, amountCents }),
          ),
        });
        setStatus(
          response.ok
            ? { kind: "saved" }
            : { kind: "error", message: response.error },
        );
      } catch {
        setStatus({
          kind: "error",
          message: "Não foi possível salvar. Tente novamente.",
        });
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        const response = await deleteMonthlyEntry(employmentId, month);
        if (response.ok) {
          setForm(EMPTY_STATE);
          setStatus(null);
        } else {
          setStatus({ kind: "error", message: response.error });
        }
      } catch {
        setStatus({
          kind: "error",
          message: "Não foi possível excluir. Tente novamente.",
        });
      }
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Rendimentos e imposto pago</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="income">Rendimentos tributáveis</Label>
              <CurrencyInput
                id="income"
                cents={form.incomeCents}
                onCentsChange={(incomeCents) => update({ incomeCents })}
              />
              <p className="text-xs text-muted-foreground">
                Valor recebido em {MONTHS[month - 1]}.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="withheldTax">Imposto pago</Label>
              <CurrencyInput
                id="withheldTax"
                cents={form.withheldTaxCents}
                onCentsChange={(withheldTaxCents) =>
                  update({ withheldTaxCents })
                }
              />
              <p className="text-xs text-muted-foreground">
                IRRF retido na fonte ou Carnê-Leão recolhido.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deduções</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="officialPension">Previdência</Label>
                <CurrencyInput
                  id="officialPension"
                  cents={form.officialPensionCents}
                  onCentsChange={(officialPensionCents) =>
                    update({ officialPensionCents })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="alimony">Pensão alimentícia</Label>
                <CurrencyInput
                  id="alimony"
                  cents={form.alimonyCents}
                  onCentsChange={(alimonyCents) => update({ alimonyCents })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dependents">Dependentes (quantidade)</Label>
                <Input
                  id="dependents"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  step={1}
                  value={form.dependents}
                  aria-describedby="dependents-hint"
                  onChange={(event) =>
                    update({
                      dependents: Math.min(
                        Math.max(Math.trunc(Number(event.target.value)) || 0, 0),
                        99,
                      ),
                    })
                  }
                />
                <p
                  id="dependents-hint"
                  className="text-xs text-muted-foreground"
                >
                  {formatBRL(params.dependentDeduction)} mensais por dependente.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-5">
              <div>
                <h3 className="text-sm font-medium">Outras deduções</h3>
                <p className="text-xs text-muted-foreground">
                  Previdência Privada, Funpresp, FAPI. Carnê-Leão: Livro Caixa.
                </p>
              </div>
              {form.otherDeductions.map((deduction) => (
                <div
                  key={deduction.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]"
                >
                  <Select
                    items={TYPE_ITEMS}
                    value={deduction.type}
                    onValueChange={(type) => {
                      if (type) updateDeduction(deduction.key, { type });
                    }}
                  >
                    <SelectTrigger
                      aria-label="Tipo da dedução"
                      className="col-span-2 w-full sm:col-span-1"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CurrencyInput
                    aria-label={`Valor de ${OTHER_DEDUCTION_LABELS[deduction.type]}`}
                    cents={deduction.amountCents}
                    onCentsChange={(amountCents) =>
                      updateDeduction(deduction.key, { amountCents })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${OTHER_DEDUCTION_LABELS[deduction.type]}`}
                    onClick={() =>
                      update({
                        otherDeductions: form.otherDeductions.filter(
                          (item) => item.key !== deduction.key,
                        ),
                      })
                    }
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="self-start"
                onClick={() =>
                  update({
                    otherDeductions: [
                      ...form.otherDeductions,
                      {
                        key: crypto.randomUUID(),
                        type: "private_pension",
                        amountCents: 0,
                      },
                    ],
                  })
                }
              >
                <Plus />
                Adicionar dedução
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />}
            Salvar mês
          </Button>
          {previousEntry && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => update(toFormState(previousEntry))}
            >
              <Copy />
              Copiar de {MONTHS[previousEntry.month - 1]}
            </Button>
          )}
          {entry && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={handleDelete}
            >
              <Trash2 />
              Excluir mês
            </Button>
          )}
          {status?.kind === "saved" && (
            <p
              role="status"
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Check className="size-4" />
              Salvo
            </p>
          )}
          {status?.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
        </div>
      </form>

      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Resultado de {MONTHS[month - 1]}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Imposto estimado no mês
            </p>
            <p className="text-3xl font-semibold tracking-tight">
              {formatBRL(result.tax)}
            </p>
          </div>
          <dl className="flex flex-col gap-2 border-t pt-4">
            <ResultRow
              label="Rendimentos tributáveis"
              value={formatBRL(result.income)}
            />
            <ResultRow
              label="Total das deduções"
              value={formatBRL(result.deductions.total)}
            />
            <ResultRow
              label="Desconto simplificado"
              value={formatBRL(result.simplifiedDeduction)}
            />
            <ResultRow
              label="Dedução utilizada"
              value={formatBRL(result.usedDeduction)}
              strong
            />
            <ResultRow
              label="Base de cálculo"
              value={formatBRL(result.base)}
              strong
            />
          </dl>
          <dl className="flex flex-col gap-2 border-t pt-4">
            <ResultRow
              label="Imposto pela tabela"
              value={formatBRL(result.grossTax)}
            />
            <ResultRow
              label="Redução (Lei 15.270/2025)"
              value={`− ${formatBRL(result.reduction)}`}
            />
            <ResultRow
              label="Faixa da tabela"
              value={formatPercent(result.nominalRate)}
            />
            <ResultRow
              label="Alíquota efetiva"
              value={formatPercent(result.effectiveRate)}
              strong
            />
            <ResultRow
              label="Imposto pago informado"
              value={formatBRL(form.withheldTaxCents / 100)}
              strong
            />
          </dl>
          <p className="text-xs text-muted-foreground">
            {result.usesSimplified
              ? "O desconto simplificado é mais vantajoso que as deduções informadas."
              : "As deduções informadas são mais vantajosas que o desconto simplificado."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
