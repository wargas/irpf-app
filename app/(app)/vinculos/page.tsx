import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  CardContent,
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
import { getEmployments, getYearEntries } from "@/lib/irpf/entries";
import { getCurrentUser } from "@/lib/session";
import { EmploymentForm } from "./employment-form";
import {
  DeleteEmploymentButton,
  EmploymentName,
} from "./employment-row-actions";

export const metadata: Metadata = {
  title: "Vínculos | IRPF",
};

async function Employments() {
  const user = await getCurrentUser();
  const { year } = getCurrentPeriod();
  const [employments, entries] = await Promise.all([
    getEmployments(user.id),
    getYearEntries(user.id, year),
  ]);

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Vínculos</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre cada fonte pagadora. Os lançamentos são feitos por vínculo, e
          os rendimentos são somados no ajuste anual.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Novo vínculo</CardTitle>
        </CardHeader>
        <CardContent>
          <EmploymentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vínculos cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {employments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte pagadora</TableHead>
                  <TableHead className="text-right">Meses em {year}</TableHead>
                  <TableHead className="text-right">Rendimentos</TableHead>
                  <TableHead className="text-right">Imposto pago</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employments.map((item) => {
                  const items = entries.filter(
                    (entry) => entry.employmentId === item.id,
                  );
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <EmploymentName
                          key={item.name}
                          id={item.id}
                          name={item.name}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Link
                          href={`/lancamentos?vinculo=${item.id}`}
                          className="underline underline-offset-4"
                        >
                          {items.length}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(
                          items.reduce((sum, entry) => sum + entry.income, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(
                          items.reduce(
                            (sum, entry) => sum + entry.withheldTax,
                            0,
                          ),
                        )}
                      </TableCell>
                      <TableCell>
                        <DeleteEmploymentButton
                          id={item.id}
                          name={item.name}
                          entries={items.length}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cadastre o primeiro vínculo para começar a fazer lançamentos.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function VinculosPage() {
  return (
    <Suspense
      fallback={
        <>
          <Skeleton className="h-14 w-full max-w-lg" />
          <Skeleton className="h-64 w-full" />
        </>
      }
    >
      <Employments />
    </Suspense>
  );
}
