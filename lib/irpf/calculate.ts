import type { OtherDeductionType } from "./deductions";
import type { MonthlyTaxParams, TaxBand } from "./tax-table";

export type EntryValues = {
  income: number;
  officialPension: number;
  dependents: number;
  alimony: number;
  otherDeductions: { type: OtherDeductionType; amount: number }[];
};

export function trunc(value: number) {
  return Math.trunc(value * 100) / 100;
}

function subtract(a: number, b: number) {
  return (100 * a - 100 * b) / 100;
}

export function applyBands(base: number, bands: TaxBand[]) {
  return bands.map((band, index) => {
    const lower = index > 0 ? bands[index - 1].limit : 0;
    const isLast = index === bands.length - 1;
    const top = isLast ? base : Math.min(base, band.limit);
    const bandBase = top > lower ? subtract(top, lower) : 0;
    return {
      rate: band.rate,
      base: bandBase,
      tax: (band.rate * bandBase) / 100,
    };
  });
}

// Mirrors the monthly calculation of the Receita Federal simulator, including
// its truncation and the reduction based on gross income (Lei 15.270/2025).
export function calculateMonth(values: EntryValues, params: MonthlyTaxParams) {
  const dependents = values.dependents * params.dependentDeduction;
  const other = values.otherDeductions.reduce(
    (sum, deduction) => sum + deduction.amount,
    0,
  );
  const totalDeductions = Number.parseFloat(
    (values.officialPension + dependents + values.alimony + other).toFixed(2),
  );

  const usesSimplified = totalDeductions <= params.simplifiedDeduction;
  const usedDeduction = usesSimplified
    ? params.simplifiedDeduction
    : totalDeductions;
  const base = Math.max(subtract(values.income, usedDeduction), 0);

  const bands = applyBands(base, params.bands);
  const grossTax = bands.reduce((sum, band) => sum + band.tax, 0);

  const nominalRate = (
    params.bands.find((band) => base <= band.limit) ?? params.bands.at(-1)!
  ).rate;

  const reductionBand = params.reductions.find(
    (reduction) => values.income <= reduction.incomeLimit,
  );
  const availableReduction = reductionBand
    ? reductionBand.maxReduction - values.income * reductionBand.coefficient
    : 0;

  const reduction =
    availableReduction > grossTax ? trunc(grossTax) : availableReduction;
  const tax =
    availableReduction > grossTax ? 0 : trunc(grossTax - availableReduction);
  const effectiveRate =
    values.income > 0 ? trunc((tax / values.income) * 100) : 0;

  return {
    income: values.income,
    deductions: {
      officialPension: values.officialPension,
      dependents,
      alimony: values.alimony,
      other,
      total: totalDeductions,
    },
    simplifiedDeduction: params.simplifiedDeduction,
    usesSimplified,
    usedDeduction,
    base,
    bands,
    grossTax: trunc(grossTax),
    reduction,
    tax,
    nominalRate,
    effectiveRate,
  };
}

export type MonthResult = ReturnType<typeof calculateMonth>;
