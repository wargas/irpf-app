import { applyBands, type EntryValues, trunc } from "./calculate";
import { calculateExpenses, type ExpenseValues } from "./expenses";
import type { AnnualTaxParams } from "./tax-table";

// Values from the law, not exposed by the Receita Federal API (ano-calendário 2026).
const SIMPLIFIED_RATE = 0.2; // Lei 9.250/1995, art. 10
const SIMPLIFIED_CAP = 17_640; // Lei 9.250/1995, art. 10, X
const PENSION_LIMIT_RATE = 0.12; // Lei 9.532/1997, art. 11
const FULL_REDUCTION_INCOME = 60_000; // Lei 9.250/1995, art. 11-A
const FULL_REDUCTION = 2_694.15;
const PARTIAL_REDUCTION_INCOME = 88_200;
const PARTIAL_REDUCTION_BASE = 8_429.73;
const PARTIAL_REDUCTION_COEFFICIENT = 0.095575;

function roundCents(value: number) {
  return Number(value.toFixed(2));
}

function availableReduction(income: number) {
  if (income <= FULL_REDUCTION_INCOME) return FULL_REDUCTION;
  if (income <= PARTIAL_REDUCTION_INCOME) {
    return PARTIAL_REDUCTION_BASE - PARTIAL_REDUCTION_COEFFICIENT * income;
  }
  return 0;
}

function calculateModel(
  income: number,
  deduction: number,
  params: AnnualTaxParams,
) {
  const base = Math.max(roundCents(income - deduction), 0);
  const grossTax = trunc(
    applyBands(base, params.bands).reduce((sum, band) => sum + band.tax, 0),
  );
  const reduction = Math.min(availableReduction(income), grossTax);

  return {
    deduction,
    base,
    grossTax,
    reduction,
    tax: roundCents(grossTax - reduction),
  };
}

export function calculateAnnual(
  entries: (EntryValues & { withheldTax: number })[],
  params: AnnualTaxParams,
  expenses: ExpenseValues[] = [],
) {
  function sum(pick: (entry: (typeof entries)[number]) => number) {
    return roundCents(entries.reduce((total, entry) => total + pick(entry), 0));
  }

  function sumOther(types: string[]) {
    return sum((entry) =>
      entry.otherDeductions
        .filter((deduction) => types.includes(deduction.type))
        .reduce((total, deduction) => total + deduction.amount, 0),
    );
  }

  const income = sum((entry) => entry.income);
  const withheldTax = sum((entry) => entry.withheldTax);

  const limitedPension = Math.min(
    sumOther(["private_pension", "fapi"]),
    roundCents(income * PENSION_LIMIT_RATE),
  );
  // The same dependent may be declared to more than one employer.
  const dependentsDeduction = roundCents(
    Math.max(0, ...entries.map((entry) => entry.dependents)) *
      params.dependentDeduction,
  );
  const { health, educationDeductible } = calculateExpenses(
    expenses,
    params.educationLimit,
  );
  const completeDeduction = roundCents(
    health +
      educationDeductible +
      sum((entry) => entry.officialPension) +
      sum((entry) => entry.alimony) +
      dependentsDeduction +
      limitedPension +
      sumOther(["funpresp", "livro_caixa"]),
  );
  const simplifiedDeduction = Math.min(
    roundCents(income * SIMPLIFIED_RATE),
    SIMPLIFIED_CAP,
  );

  const complete = calculateModel(income, completeDeduction, params);
  const simplified = calculateModel(income, simplifiedDeduction, params);
  const usesSimplified = simplified.tax < complete.tax;
  const chosen = usesSimplified ? simplified : complete;

  return {
    income,
    withheldTax,
    health,
    educationDeductible,
    dependentsDeduction,
    usesSimplified,
    ...chosen,
    alternativeTax: usesSimplified ? complete.tax : simplified.tax,
    // Positive: to be refunded. Negative: still owed.
    balance: roundCents(withheldTax - chosen.tax),
    effectiveRate: income > 0 ? trunc((chosen.tax / income) * 100) : 0,
  };
}

export type AnnualResult = ReturnType<typeof calculateAnnual>;
