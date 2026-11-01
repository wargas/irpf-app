import { describe, expect, test } from "bun:test";
import { calculateAnnual } from "./annual";
import { calculateMonth, type EntryValues } from "./calculate";
import { calculateExpenses } from "./expenses";
import tabela from "./__fixtures__/tabela-2026.json";
import { summarizeEmployments, summarizeYear } from "./summary";
import { parseTaxTable } from "./tax-table";

const table = parseTaxTable(2026, tabela);
const params = table.months[0];

function entry(values: Partial<EntryValues>): EntryValues {
  return {
    income: 0,
    officialPension: 0,
    dependents: 0,
    alimony: 0,
    otherDeductions: [],
    ...values,
  };
}

describe("calculateMonth", () => {
  test("applies the simplified discount when it beats the deductions", () => {
    const result = calculateMonth(
      entry({ income: 4000, officialPension: 100 }),
      params,
    );

    expect(result.usesSimplified).toBe(true);
    expect(result.usedDeduction).toBe(607.2);
    expect(result.base).toBe(3392.8);
  });

  test("zeroes the tax up to the R$ 5.000 exemption", () => {
    const result = calculateMonth(entry({ income: 5000 }), params);

    expect(result.grossTax).toBeGreaterThan(0);
    expect(result.tax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  test("sums every deduction type", () => {
    const result = calculateMonth(
      entry({
        income: 10000,
        officialPension: 900,
        dependents: 2,
        alimony: 500,
        otherDeductions: [
          { type: "fapi", amount: 100 },
          { type: "livro_caixa", amount: 200.5 },
        ],
      }),
      params,
    );

    expect(result.usesSimplified).toBe(false);
    expect(result.deductions.dependents).toBeCloseTo(379.18);
    expect(result.usedDeduction).toBe(2079.68);
    expect(result.base).toBe(7920.32);
  });

  test("never produces a negative base", () => {
    const result = calculateMonth(
      entry({ income: 1000, officialPension: 5000 }),
      params,
    );

    expect(result.base).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.nominalRate).toBe(0);
  });
});

// Expected values captured from the Receita Federal simulator (Janeiro/2026).
const OFFICIAL_CASES = [
  { values: { income: 3000.25 }, base: 2393.05, reduction: 0, tax: 0, rate: 0 },
  { values: { income: 4000, officialPension: 100 }, base: 3392.8, reduction: 114.76, tax: 0, rate: 0 },
  { values: { income: 5000 }, base: 4392.8, reduction: 312.89, tax: 0, rate: 0 },
  { values: { income: 5000.01 }, base: 4392.81, reduction: 312.89, tax: 0, rate: 0 },
  { values: { income: 6000 }, base: 5392.8, reduction: 179.75, tax: 394.54, rate: 6.57 },
  { values: { income: 6000, officialPension: 600, dependents: 1 }, base: 5210.41, reduction: 179.75, tax: 344.39, rate: 5.73 },
  { values: { income: 7350 }, base: 6742.8, reduction: 0, tax: 945.54, rate: 12.86 },
  { values: { income: 7350.01 }, base: 6742.81, reduction: 0, tax: 945.55, rate: 12.86 },
  { values: { income: 7500, officialPension: 800, dependents: 2, alimony: 300, otherDeductions: [{ type: "fapi" as const, amount: 150.5 }] }, base: 5870.32, reduction: 0, tax: 705.61, rate: 9.4 },
  { values: { income: 10000, officialPension: 900, dependents: 2, alimony: 500, otherDeductions: [{ type: "fapi" as const, amount: 300.5 }] }, base: 7920.32, reduction: 0, tax: 1269.36, rate: 12.69 },
  { values: { income: 25000.77, officialPension: 988.09 }, base: 24012.68, reduction: 0, tax: 5694.76, rate: 22.77 },
  { values: { income: 1000, officialPension: 5000 }, base: 0, reduction: 0, tax: 0, rate: 0 },
];

describe("official simulator parity", () => {
  test.each(OFFICIAL_CASES)("income $values.income", (expected) => {
    const result = calculateMonth(entry(expected.values), params);

    expect(result.base).toBeCloseTo(expected.base, 2);
    expect(result.reduction).toBeCloseTo(expected.reduction, 2);
    expect(result.tax).toBeCloseTo(expected.tax, 2);
    expect(result.effectiveRate).toBeCloseTo(expected.rate, 2);
  });
});

describe("calculateAnnual", () => {
  function months(count: number, values: Partial<EntryValues>, withheldTax = 0) {
    return Array.from({ length: count }, () => ({
      ...entry(values),
      withheldTax,
    }));
  }

  test("zeroes the tax up to R$ 60.000 and refunds everything paid", () => {
    const result = calculateAnnual(
      months(12, { income: 4000, officialPension: 400 }, 100),
      table.annual,
    );

    expect(result.income).toBe(48000);
    expect(result.tax).toBe(0);
    expect(result.balance).toBe(1200);
  });

  test("picks the complete model and refunds the difference", () => {
    const result = calculateAnnual(
      months(12, { income: 10000, officialPension: 900, dependents: 2, alimony: 500 }, 1500),
      table.annual,
    );

    expect(result.usesSimplified).toBe(false);
    expect(result.deduction).toBeCloseTo(21350.16, 2);
    expect(result.base).toBeCloseTo(98649.84, 2);
    expect(result.reduction).toBe(0);
    expect(result.tax).toBeCloseTo(16274.92, 2);
    expect(result.balance).toBeCloseTo(1725.08, 2);
  });

  test("caps the simplified discount at R$ 17.640", () => {
    const result = calculateAnnual(months(12, { income: 10000 }, 0), table.annual);

    expect(result.usesSimplified).toBe(true);
    expect(result.deduction).toBe(17640);
    expect(result.balance).toBeLessThan(0);
  });

  test("applies the decreasing reduction between R$ 60.000 and R$ 88.200", () => {
    const result = calculateAnnual(months(12, { income: 6000 }, 0), table.annual);

    expect(result.income).toBe(72000);
    expect(result.reduction).toBeCloseTo(8429.73 - 0.095575 * 72000, 2);
  });

  test("limits private pension and FAPI to 12% of income, but not Funpresp", () => {
    const pension = calculateAnnual(
      months(1, {
        income: 100000,
        otherDeductions: [
          { type: "private_pension", amount: 10000 },
          { type: "fapi", amount: 10000 },
        ],
      }),
      table.annual,
    );
    const funpresp = calculateAnnual(
      months(1, {
        income: 100000,
        otherDeductions: [{ type: "funpresp", amount: 20000 }],
      }),
      table.annual,
    );

    expect(pension.deduction).toBe(17640);
    expect(funpresp.deduction).toBe(20000);
  });

  test("counts each dependent once per year", () => {
    const result = calculateAnnual(
      [
        ...months(6, { income: 20000, officialPension: 3000, dependents: 1 }),
        ...months(6, { income: 20000, officialPension: 3000, dependents: 2 }),
      ],
      table.annual,
    );

    expect(result.deduction).toBeCloseTo(36000 + 2 * 2275.08, 2);
  });
});

describe("expenses in the annual adjustment", () => {
  const income = [{ ...entry({ income: 200000 }), withheldTax: 0 }];

  test("deducts health without a limit", () => {
    const result = calculateAnnual(income, table.annual, [
      { category: "health", beneficiary: "Titular", amount: 50000 },
    ]);

    expect(result.usesSimplified).toBe(false);
    expect(result.health).toBe(50000);
    expect(result.deduction).toBe(50000);
  });

  test("limits education per person, ignoring name case", () => {
    const result = calculateExpenses(
      [
        { category: "education", beneficiary: "Ana", amount: 3000 },
        { category: "education", beneficiary: " ana ", amount: 3000 },
        { category: "education", beneficiary: "Titular", amount: 1000 },
      ],
      table.annual.educationLimit,
    );

    expect(result.educationDeclared).toBe(7000);
    expect(result.educationDeductible).toBe(4561.5);
  });

  test("ignores expenses when the simplified model is better", () => {
    const result = calculateAnnual(income, table.annual, [
      { category: "health", beneficiary: "Titular", amount: 100 },
    ]);

    expect(result.usesSimplified).toBe(true);
    expect(result.deduction).toBe(17640);
  });
});

describe("two employments in the same period", () => {
  const entries = [
    { ...entry({ income: 5000 }), month: 1, withheldTax: 0, employmentId: "a" },
    { ...entry({ income: 5000 }), month: 1, withheldTax: 0, employmentId: "b" },
    { ...entry({ income: 7000 }), month: 2, withheldTax: 800, employmentId: "a" },
  ];

  test("calculates each employment on its own and adds up the month", () => {
    const summary = summarizeYear(entries, table);

    expect(summary.months).toHaveLength(2);
    expect(summary.months[0].income).toBe(10000);
    expect(summary.months[0].tax).toBe(0);
    expect(summary.entriesCount).toBe(3);
  });

  test("adds the income of both employments in the annual adjustment", () => {
    const year = months12();

    expect(year.annual.income).toBe(120000);
    expect(year.annual.tax).toBeGreaterThan(0);
    expect(year.annual.balance).toBe(-year.annual.tax);
    expect(year.months[0].tax).toBe(0);
  });

  test("counts a dependent declared to both employers once", () => {
    const summary = summarizeYear(
      [
        { ...entry({ income: 9000, dependents: 1 }), month: 1, withheldTax: 0 },
        { ...entry({ income: 9000, dependents: 1 }), month: 1, withheldTax: 0 },
      ],
      table,
    );

    expect(summary.annual.dependentsDeduction).toBe(2275.08);
  });

  test("breaks the totals down by employment", () => {
    const result = summarizeEmployments(
      entries,
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      table,
    );

    expect(result[0]).toMatchObject({ months: 2, income: 12000, withheldTax: 800 });
    expect(result[1]).toMatchObject({ months: 1, income: 5000, tax: 0 });
    expect(result[2]).toMatchObject({ months: 0, income: 0, tax: 0 });
  });

  function months12() {
    return summarizeYear(
      Array.from({ length: 12 }, (_, index) => [
        { ...entry({ income: 5000 }), month: index + 1, withheldTax: 0 },
        { ...entry({ income: 5000 }), month: index + 1, withheldTax: 0 },
      ]).flat(),
      table,
    );
  }
});

describe("summarizeYear", () => {
  test("adds up the months and ranks declared deductions", () => {
    const summary = summarizeYear(
      [
        { month: 2, withheldTax: 500, ...entry({ income: 10000, alimony: 1000 }) },
        { month: 1, withheldTax: 500, ...entry({ income: 10000, officialPension: 800 }) },
      ],
      table,
    );

    expect(summary.months.map((item) => item.month)).toEqual([1, 2]);
    expect(summary.annual.income).toBe(20000);
    expect(summary.annual.withheldTax).toBe(1000);
    expect(summary.declaredDeductions.map((item) => item.label)).toEqual([
      "Pensão alimentícia",
      "Previdência oficial",
    ]);
  });
});
