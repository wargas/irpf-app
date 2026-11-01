"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { expense } from "@/lib/db/schema";
import { getCurrentPeriod } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/irpf/expenses";
import { getCurrentUser } from "@/lib/session";

const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1).max(255),
  beneficiary: z.string().trim().min(1).max(120),
  date: z.iso.date(),
  amountCents: z.number().int().min(1).max(999_999_999_999),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateExpenses() {
  revalidatePath("/");
  revalidatePath("/despesas");
}

export async function addExpense(input: ExpenseInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = expenseSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Confira os dados informados." };
  }

  const { amountCents, ...data } = parsed.data;
  const { year } = getCurrentPeriod();

  if (!data.date.startsWith(`${year}-`)) {
    return { ok: false, error: `Informe uma data de ${year}.` };
  }

  await db.insert(expense).values({
    id: crypto.randomUUID(),
    userId: user.id,
    year,
    amount: amountCents / 100,
    ...data,
  });

  revalidateExpenses();
  return { ok: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = z.uuid().safeParse(id);

  if (!parsed.success) {
    return { ok: false, error: "Despesa inválida." };
  }

  await db
    .delete(expense)
    .where(and(eq(expense.id, parsed.data), eq(expense.userId, user.id)));

  revalidateExpenses();
  return { ok: true };
}
