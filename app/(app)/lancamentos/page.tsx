import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCurrentPeriod, SHORT_MONTHS } from "@/lib/format";
import { getEmployments, getYearEntries } from "@/lib/irpf/entries";
import { getTaxTable } from "@/lib/irpf/get-tax-table";
import { getCurrentUser } from "@/lib/session";
import { EntryForm } from "./entry-form";

export const metadata: Metadata = {
  title: "Lançamentos | IRPF",
};

async function Entries({
  searchParams,
}: {
  searchParams: PageProps<"/lancamentos">["searchParams"];
}) {
  const user = await getCurrentUser();
  const { year, month: currentMonth } = getCurrentPeriod();
  const { mes, vinculo } = await searchParams;
  const requested = Number(mes);
  const month =
    Number.isInteger(requested) && requested >= 1 && requested <= 12
      ? requested
      : currentMonth;

  const [employments, allEntries, table] = await Promise.all([
    getEmployments(user.id),
    getYearEntries(user.id, year),
    getTaxTable(year),
  ]);

  if (employments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cadastre um vínculo</CardTitle>
          <CardDescription>
            Os lançamentos são feitos por fonte pagadora. Cadastre pelo menos um
            vínculo para começar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/vinculos" />} nativeButton={false}>
            Cadastrar vínculo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const employment =
    employments.find((item) => item.id === vinculo) ?? employments[0];
  const entries = allEntries.filter(
    (item) => item.employmentId === employment.id,
  );
  const entry = entries.find((item) => item.month === month);
  const filledMonths = new Set(entries.map((item) => item.month));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lançamentos de {year}
        </h1>
        <p className="text-sm text-muted-foreground">
          Informe rendimentos e deduções de cada mês, por vínculo. O cálculo
          mensal é separado por fonte pagadora e usa os parâmetros oficiais da
          Receita Federal.
        </p>
      </header>

      <nav aria-label="Vínculo" className="flex flex-wrap gap-2">
        {employments.map((item) => (
          <Link
            key={item.id}
            href={`/lancamentos?vinculo=${item.id}&mes=${month}`}
            aria-current={item.id === employment.id ? "true" : undefined}
            className={cn(
              "max-w-full truncate rounded-lg border px-3 py-1.5 text-sm hover:bg-muted",
              item.id === employment.id && "border-foreground font-medium",
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Mês do lançamento"
        className="grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-12"
      >
        {SHORT_MONTHS.map((label, index) => {
          const value = index + 1;
          const isFilled = filledMonths.has(value);
          return (
            <Link
              key={label}
              href={`/lancamentos?vinculo=${employment.id}&mes=${value}`}
              aria-current={value === month ? "page" : undefined}
              aria-label={`${label}${isFilled ? ", lançado" : ""}`}
              className={cn(
                "flex h-9 items-center justify-center gap-1 rounded-lg text-sm hover:bg-muted",
                value === month &&
                  "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {label}
              {isFilled && <Check aria-hidden className="size-3.5" />}
            </Link>
          );
        })}
      </nav>

      <EntryForm
        key={`${employment.id}-${month}`}
        employmentId={employment.id}
        month={month}
        params={table.months[month - 1]}
        entry={entry}
        previousEntry={entries.find((item) => item.month === month - 1)}
      />
    </>
  );
}

export default function LancamentosPage({
  searchParams,
}: PageProps<"/lancamentos">) {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-14 w-full max-w-lg" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-96 w-full" />
        </>
      }
    >
      <Entries searchParams={searchParams} />
    </Suspense>
  );
}
