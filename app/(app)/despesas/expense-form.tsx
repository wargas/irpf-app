"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/irpf/expenses";
import { addExpense } from "./actions";

const CATEGORY_ITEMS = EXPENSE_CATEGORIES.map((value) => ({
  value,
  label: EXPENSE_CATEGORY_LABELS[value],
}));

export function ExpenseForm({
  year,
  defaultDate,
  beneficiaries,
}: {
  year: number;
  defaultDate: string;
  beneficiaries: string[];
}) {
  const [category, setCategory] = useState<ExpenseCategory>("health");
  const [description, setDescription] = useState("");
  const [beneficiary, setBeneficiary] = useState("Titular");
  const [date, setDate] = useState(defaultDate);
  const [amountCents, setAmountCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (amountCents === 0) {
      setError("Informe o valor da despesa.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await addExpense({
          category,
          description,
          beneficiary,
          date,
          amountCents,
        });
        if (response.ok) {
          setDescription("");
          setAmountCents(0);
        } else {
          setError(response.error);
        }
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label id="category-label">Tipo</Label>
          <Select
            items={CATEGORY_ITEMS}
            value={category}
            onValueChange={(value) => {
              if (value) setCategory(value);
            }}
          >
            <SelectTrigger aria-labelledby="category-label" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Data do pagamento</Label>
          <Input
            id="date"
            type="date"
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          maxLength={255}
          placeholder={
            category === "health"
              ? "Consulta, exame, plano de saúde..."
              : "Mensalidade escolar, faculdade..."
          }
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="beneficiary">Para quem</Label>
          <Input
            id="beneficiary"
            list="beneficiaries"
            maxLength={120}
            value={beneficiary}
            onChange={(event) => setBeneficiary(event.target.value)}
            aria-describedby="beneficiary-hint"
            required
          />
          <datalist id="beneficiaries">
            {beneficiaries.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p id="beneficiary-hint" className="text-xs text-muted-foreground">
            Use sempre o mesmo nome: o limite de instrução é por pessoa.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Valor pago</Label>
          <CurrencyInput
            id="amount"
            cents={amountCents}
            onCentsChange={setAmountCents}
            aria-describedby="amount-hint"
          />
          <p id="amount-hint" className="text-xs text-muted-foreground">
            Desconte o que tiver sido reembolsado.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
        Adicionar despesa
      </Button>
    </form>
  );
}
