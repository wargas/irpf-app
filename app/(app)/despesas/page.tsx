import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, getCurrentPeriod } from "@/lib/format";
import { getYearExpenses } from "@/lib/irpf/entries";
import { calculateExpenses, EXPENSE_CATEGORY_LABELS } from "@/lib/irpf/expenses";
import { getTaxTable } from "@/lib/irpf/get-tax-table";
import { getCurrentUser } from "@/lib/session";
import { DeleteExpenseButton } from "./delete-expense-button";
import { ExpenseForm } from "./expense-form";

export const metadata: Metadata = {
  title: "Despesas | IRPF",
};

function formatDate(date: string) {
  return date.split("-").toReversed().join("/");
}

async function Expenses() {
  const user = await getCurrentUser();
  const { year, date } = getCurrentPeriod();
  const [expenses, table] = await Promise.all([
    getYearExpenses(user.id, year),
    getTaxTable(year),
  ]);
  const { educationLimit } = table.annual;
  const totals = calculateExpenses(expenses, educationLimit);
  const beneficiaries = [
    ...new Set(["Titular", ...expenses.map((item) => item.beneficiary)]),
  ];

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Despesas com saúde e instrução em {year}
        </h1>
        <p className="text-sm text-muted-foreground">
          Essas despesas entram no ajuste anual e só reduzem o imposto no modelo
          completo da declaração.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Nova despesa</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              year={year}
              defaultDate={date}
              beneficiaries={beneficiaries}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dedutível no ano</CardTitle>
            <CardDescription>
              Saúde não tem limite. Instrução é limitada a{" "}
              {formatBRL(educationLimit)} por pessoa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Saúde</dt>
                <dd className="font-medium tabular-nums">
                  {formatBRL(totals.health)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Instrução</dt>
                <dd className="font-medium tabular-nums">
                  {formatBRL(totals.educationDeductible)}
                </dd>
              </div>
              {totals.education.map((person) => (
                <div
                  key={person.name}
                  className="flex items-baseline justify-between gap-4 border-t pt-3 text-xs"
                >
                  <dt className="min-w-0 truncate text-muted-foreground">
                    {person.name}
                  </dt>
                  <dd className="text-right tabular-nums">
                    {formatBRL(person.deductible)}
                    {person.declared > person.deductible && (
                      <span className="block text-muted-foreground">
                        de {formatBRL(person.declared)} informados
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Despesas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Para quem</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="tabular-nums">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell>
                      {EXPENSE_CATEGORY_LABELS[item.category]}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.beneficiary}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(item.amount)}
                    </TableCell>
                    <TableCell>
                      <DeleteExpenseButton
                        id={item.id}
                        description={item.description}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa cadastrada em {year}.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function DespesasPage() {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-14 w-full max-w-lg" />
          <Skeleton className="h-96 w-full" />
        </>
      }
    >
      <Expenses />
    </Suspense>
  );
}
