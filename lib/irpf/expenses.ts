export const EXPENSE_CATEGORIES = ["health", "education"] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  health: "Saúde",
  education: "Instrução",
};

export type ExpenseValues = {
  category: ExpenseCategory;
  beneficiary: string;
  amount: number;
};

function roundCents(value: number) {
  return Number(value.toFixed(2));
}

function personKey(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR");
}

// Health has no limit. Education is limited per person: the taxpayer and each
// dependent or alimony recipient (Lei 9.250/1995, art. 8º, II, b).
export function calculateExpenses(
  expenses: ExpenseValues[],
  educationLimit: number,
) {
  const people = new Map<string, { name: string; declared: number }>();

  for (const expense of expenses) {
    if (expense.category !== "education") continue;
    const key = personKey(expense.beneficiary);
    const person = people.get(key) ?? { name: expense.beneficiary, declared: 0 };
    person.declared = roundCents(person.declared + expense.amount);
    people.set(key, person);
  }

  const education = [...people.values()].map((person) => ({
    ...person,
    deductible: Math.min(person.declared, educationLimit),
  }));

  return {
    health: roundCents(
      expenses
        .filter((expense) => expense.category === "health")
        .reduce((total, expense) => total + expense.amount, 0),
    ),
    education,
    educationDeclared: roundCents(
      education.reduce((total, person) => total + person.declared, 0),
    ),
    educationDeductible: roundCents(
      education.reduce((total, person) => total + person.deductible, 0),
    ),
  };
}
