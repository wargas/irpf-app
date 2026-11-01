import { Check, Info } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBRL,
  formatPercent,
  getCurrentPeriod,
  MONTHS,
  SHORT_MONTHS,
} from "@/lib/format";
import {
  getEmployments,
  getYearEntries,
  getYearExpenses,
} from "@/lib/irpf/entries";
import { getTaxTable } from "@/lib/irpf/get-tax-table";
import {
  summarizeEmployments,
  summarizeYear,
  type YearSummary,
} from "@/lib/irpf/summary";
import { getCurrentUser } from "@/lib/session";
import { IncomeChart, RateChart } from "./charts";

export const metadata: Metadata = {
  title: "Painel | IRPF",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function HorizontalBar({
  label,
  detail,
  value,
  max,
}: {
  label: string;
  detail: string;
  value: number;
  max: number;
}) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{detail}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-chart-1"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </li>
  );
}

function FlowRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex items-baseline justify-between gap-4 border-t pt-3 text-sm font-medium"
          : "flex items-baseline justify-between gap-4 text-sm"
      }
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function DeductionsCard({ summary }: { summary: YearSummary }) {
  const max = summary.declaredDeductions[0]?.amount ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deduções informadas</CardTitle>
        <CardDescription>Acumulado por tipo no ano.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.declaredDeductions.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {summary.declaredDeductions.map((deduction) => (
              <HorizontalBar
                key={deduction.label}
                label={deduction.label}
                detail={formatBRL(deduction.amount)}
                value={deduction.amount}
                max={max}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma dedução informada até agora.
          </p>
        )}
        {summary.entriesWithSimplified > 0 && (
          <p className="border-t pt-4 text-xs text-muted-foreground">
            Em {summary.entriesWithSimplified} de {summary.entriesCount}{" "}
            {summary.entriesCount === 1 ? "lançamento" : "lançamentos"}, o
            desconto simplificado mensal foi mais vantajoso que as deduções
            informadas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BandsCard({ summary }: { summary: YearSummary }) {
  const max = Math.max(...summary.bands.map((band) => band.base));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base de cálculo por faixa</CardTitle>
        <CardDescription>
          Quanto da sua base caiu em cada alíquota da tabela mensal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {summary.bands.map((band) => (
            <HorizontalBar
              key={band.rate}
              label={band.rate === 0 ? "Isento" : formatPercent(band.rate)}
              detail={formatBRL(band.base)}
              value={band.base}
              max={max}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnnualCard({ summary }: { summary: YearSummary }) {
  const { annual } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajuste anual</CardTitle>
        <CardDescription>
          Modelo {annual.usesSimplified ? "simplificado" : "completo"}, o mais
          vantajoso com os dados informados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="flex flex-col gap-3">
          <FlowRow
            label="Rendimentos tributáveis"
            value={formatBRL(annual.income)}
          />
          <FlowRow
            label={annual.usesSimplified ? "Desconto simplificado" : "Deduções"}
            value={`− ${formatBRL(annual.deduction)}`}
          />
          <FlowRow
            label="Base de cálculo"
            value={formatBRL(annual.base)}
            strong
          />
          <FlowRow
            label="Imposto pela tabela anual"
            value={formatBRL(annual.grossTax)}
          />
          <FlowRow
            label="Redução (Lei 15.270/2025)"
            value={`− ${formatBRL(annual.reduction)}`}
          />
          <FlowRow
            label="Imposto devido"
            value={formatBRL(annual.tax)}
            strong
          />
          <FlowRow
            label="Imposto pago"
            value={`− ${formatBRL(annual.withheldTax)}`}
          />
          <FlowRow
            label={annual.balance < 0 ? "A pagar" : "A restituir"}
            value={formatBRL(Math.abs(annual.balance))}
            strong
          />
        </dl>
        <p className="border-t pt-4 text-xs text-muted-foreground">
          {annual.usesSimplified
            ? "As despesas com saúde e instrução só reduzem o imposto no modelo completo."
            : `As deduções incluem ${formatBRL(annual.health)} de saúde e ${formatBRL(annual.educationDeductible)} de instrução.`}{" "}
          <Link href="/despesas" className="underline underline-offset-4">
            Ver despesas
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function MonthsTable({ summary }: { summary: YearSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mês a mês</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Rendimentos</TableHead>
              <TableHead className="text-right">Imposto estimado</TableHead>
              <TableHead className="text-right">Imposto pago</TableHead>
              <TableHead className="text-right">Alíquota efetiva</TableHead>
              <TableHead className="text-right">Faixa</TableHead>
              <TableHead className="text-right">Dedução utilizada</TableHead>
              <TableHead className="text-right">Base de cálculo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.months.map((row) => (
              <TableRow key={row.month}>
                <TableCell>
                  <Link
                    href={`/lancamentos?mes=${row.month}`}
                    className="underline underline-offset-4"
                  >
                    {MONTHS[row.month - 1]}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(row.income)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatBRL(row.tax)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(row.withheldTax)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.effectiveRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.nominalRate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(row.usedDeduction)}
                  {row.usesSimplified && (
                    <span className="block text-xs text-muted-foreground">
                      simplificado
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(row.base)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmploymentsCard({
  employments,
}: {
  employments: ReturnType<typeof summarizeEmployments>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Por vínculo</CardTitle>
        {employments.length > 1 && (
          <CardDescription>
            Cada fonte pagadora calcula o imposto como se fosse sua única renda.
            No ajuste anual os rendimentos são somados, o que pode gerar imposto
            a pagar.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fonte pagadora</TableHead>
              <TableHead className="text-right">Meses</TableHead>
              <TableHead className="text-right">Rendimentos</TableHead>
              <TableHead className="text-right">Imposto estimado</TableHead>
              <TableHead className="text-right">Imposto pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employments.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    href={`/lancamentos?vinculo=${item.id}`}
                    className="underline underline-offset-4"
                  >
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.months}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(item.income)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(item.tax)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBRL(item.withheldTax)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

async function Dashboard() {
  const user = await getCurrentUser();
  const { year } = getCurrentPeriod();
  const [employments, entries, expenses, table] = await Promise.all([
    getEmployments(user.id),
    getYearEntries(user.id, year),
    getYearExpenses(user.id, year),
    getTaxTable(year),
  ]);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum lançamento em {year}</CardTitle>
          <CardDescription>
            Cadastre seus rendimentos e deduções para acompanhar o seu imposto
            ao longo do ano.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/lancamentos" />} nativeButton={false}>
            Fazer o primeiro lançamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = summarizeYear(entries, table, expenses);
  const { annual } = summary;
  const missingMonths = 12 - summary.months.length;
  const byMonth = new Map(summary.months.map((item) => [item.month, item]));
  const chartData = SHORT_MONTHS.map((label, index) => {
    const row = byMonth.get(index + 1);
    return {
      label,
      net: row ? row.income - row.tax : null,
      tax: row ? row.tax : null,
      effectiveRate: row ? row.effectiveRate : null,
      nominalRate: row ? row.nominalRate : null,
    };
  });

  return (
    <>
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            {annual.balance < 0
              ? "Imposto a pagar estimado"
              : "Restituição estimada"}{" "}
            em {year}
          </p>
          <p className="text-5xl font-semibold tracking-tight">
            {formatBRL(Math.abs(annual.balance))}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Check aria-hidden className="size-4" />
            {summary.months.length} de 12 meses lançados
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:gap-10">
          <Stat label="Rendimentos" value={formatBRL(annual.income)} />
          <Stat label="Imposto pago" value={formatBRL(annual.withheldTax)} />
          <Stat label="Imposto devido" value={formatBRL(annual.tax)} />
        </dl>
      </section>

      {(missingMonths > 0 || annual.withheldTax === 0) && (
        <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            {annual.withheldTax === 0 && (
              <p>
                Informe o imposto pago em cada mês para calcular a restituição.
              </p>
            )}
            {missingMonths > 0 && (
              <p>
                Estimativa parcial: {missingMonths === 1 ? "falta" : "faltam"}{" "}
                {missingMonths} {missingMonths === 1 ? "mês" : "meses"}. A
                tabela anual vale para o ano inteiro, então a restituição tende
                a diminuir conforme os próximos rendimentos forem lançados.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rendimentos por mês</CardTitle>
            <CardDescription>
              Quanto do rendimento fica com você e quanto vai para o imposto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alíquota por mês</CardTitle>
            <CardDescription>
              O que você paga de fato, comparado à faixa da tabela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RateChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AnnualCard summary={summary} />
        <BandsCard summary={summary} />
        <DeductionsCard summary={summary} />
      </div>

      <EmploymentsCard
        employments={summarizeEmployments(entries, employments, table)}
      />

      <MonthsTable summary={summary} />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-24 w-full max-w-md" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
