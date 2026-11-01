import { cacheLife } from "next/cache";
import { parseTaxTable } from "./tax-table";

export async function getTaxTable(year: number) {
  "use cache";
  cacheLife("days");

  const response = await fetch(
    `https://www27.receita.fazenda.gov.br/api/simulador/tabela/${year}`,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (!response.ok) {
    throw new Error(`Receita Federal respondeu ${response.status}`);
  }

  return parseTaxTable(year, await response.json());
}
