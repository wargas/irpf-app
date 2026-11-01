import { calculateAnnual } from "./annual";
import { calculateMonth, type EntryValues, trunc } from "./calculate";
import { OTHER_DEDUCTION_LABELS, OTHER_DEDUCTION_TYPES } from "./deductions";
import type { ExpenseValues } from "./expenses";
import type { TaxTable } from "./tax-table";

type SummaryEntry = EntryValues & { month: number; withheldTax: number };

function total<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

export function summarizeYear(
  entries: SummaryEntry[],
  table: TaxTable,
  expenses: ExpenseValues[] = [],
) {
  const calculated = entries.map((entry) => ({
    entry,
    result: calculateMonth(entry, table.months[entry.month - 1]),
  }));
  const results = calculated.map((item) => item.result);

  // Each employment is withheld on its own, so a month adds up its entries.
  const months = [...new Set(entries.map((entry) => entry.month))]
    .toSorted((a, b) => a - b)
    .map((month) => {
      const items = calculated.filter((item) => item.entry.month === month);
      const income = total(items, (item) => item.result.income);
      const tax = total(items, (item) => item.result.tax);
      return {
        month,
        income,
        tax,
        withheldTax: total(items, (item) => item.entry.withheldTax),
        usedDeduction: total(items, (item) => item.result.usedDeduction),
        base: total(items, (item) => item.result.base),
        usesSimplified: items.some((item) => item.result.usesSimplified),
        nominalRate: Math.max(...items.map((item) => item.result.nominalRate)),
        effectiveRate: income > 0 ? trunc((tax / income) * 100) : 0,
      };
    });

  const annual = calculateAnnual(entries, table.annual, expenses);

  const declaredDeductions = [
    { label: "Saúde", amount: annual.health },
    { label: "Instrução (dedutível)", amount: annual.educationDeductible },
    {
      label: "Previdência oficial",
      amount: total(results, (result) => result.deductions.officialPension),
    },
    { label: "Dependentes", amount: annual.dependentsDeduction },
    {
      label: "Pensão alimentícia",
      amount: total(results, (result) => result.deductions.alimony),
    },
    ...OTHER_DEDUCTION_TYPES.map((type) => ({
      label: OTHER_DEDUCTION_LABELS[type],
      amount: total(
        entries
          .flatMap((entry) => entry.otherDeductions)
          .filter((deduction) => deduction.type === type),
        (deduction) => deduction.amount,
      ),
    })),
  ]
    .filter((deduction) => deduction.amount > 0)
    .toSorted((a, b) => b.amount - a.amount);

  const bands = (table.months[0]?.bands ?? []).map((band, index) => ({
    rate: band.rate,
    base: total(results, (result) => result.bands[index].base),
    tax: total(results, (result) => result.bands[index].tax),
  }));

  return {
    months,
    annual,
    declaredDeductions,
    entriesCount: entries.length,
    entriesWithSimplified: results.filter((result) => result.usesSimplified)
      .length,
    bands,
  };
}

export type YearSummary = ReturnType<typeof summarizeYear>;

export function summarizeEmployments(
  entries: (SummaryEntry & { employmentId: string })[],
  employments: { id: string; name: string }[],
  table: TaxTable,
) {
  return employments.map((employment) => {
    const items = entries.filter(
      (entry) => entry.employmentId === employment.id,
    );
    return {
      id: employment.id,
      name: employment.name,
      months: items.length,
      income: total(items, (entry) => entry.income),
      withheldTax: total(items, (entry) => entry.withheldTax),
      tax: total(
        items,
        (entry) => calculateMonth(entry, table.months[entry.month - 1]).tax,
      ),
    };
  });
}
