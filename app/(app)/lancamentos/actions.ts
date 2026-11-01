"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { employment, monthlyEntry, otherDeduction } from "@/lib/db/schema";
import { getCurrentPeriod } from "@/lib/format";
import { OTHER_DEDUCTION_TYPES } from "@/lib/irpf/deductions";
import { getCurrentUser } from "@/lib/session";

const cents = z.number().int().min(0).max(999_999_999_999);
const monthSchema = z.number().int().min(1).max(12);
const employmentIdSchema = z.string().min(1).max(36);

const entrySchema = z.object({
  employmentId: employmentIdSchema,
  month: monthSchema,
  incomeCents: cents.min(1),
  officialPensionCents: cents,
  dependents: z.number().int().min(0).max(99),
  alimonyCents: cents,
  withheldTaxCents: cents,
  otherDeductions: z
    .array(
      z.object({
        type: z.enum(OTHER_DEDUCTION_TYPES),
        amountCents: cents.min(1),
      }),
    )
    .max(50),
});

export type EntryInput = z.infer<typeof entrySchema>;

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateEntries() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/vinculos");
}

export async function saveMonthlyEntry(input: EntryInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsed = entrySchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Confira os valores informados." };
  }

  const data = parsed.data;
  const { year } = getCurrentPeriod();

  const [owned] = await db
    .select({ id: employment.id })
    .from(employment)
    .where(
      and(eq(employment.id, data.employmentId), eq(employment.userId, user.id)),
    );

  if (!owned) {
    return { ok: false, error: "Vínculo inválido." };
  }

  const values = {
    income: data.incomeCents / 100,
    officialPension: data.officialPensionCents / 100,
    dependents: data.dependents,
    alimony: data.alimonyCents / 100,
    withheldTax: data.withheldTaxCents / 100,
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(monthlyEntry)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        employmentId: owned.id,
        year,
        month: data.month,
        ...values,
      })
      .onDuplicateKeyUpdate({ set: values });

    const [entry] = await tx
      .select({ id: monthlyEntry.id })
      .from(monthlyEntry)
      .where(
        and(
          eq(monthlyEntry.userId, user.id),
          eq(monthlyEntry.employmentId, owned.id),
          eq(monthlyEntry.year, year),
          eq(monthlyEntry.month, data.month),
        ),
      );

    await tx.delete(otherDeduction).where(eq(otherDeduction.entryId, entry.id));

    if (data.otherDeductions.length > 0) {
      await tx.insert(otherDeduction).values(
        data.otherDeductions.map((deduction) => ({
          id: crypto.randomUUID(),
          entryId: entry.id,
          type: deduction.type,
          amount: deduction.amountCents / 100,
        })),
      );
    }
  });

  revalidateEntries();
  return { ok: true };
}

export async function deleteMonthlyEntry(
  employmentId: string,
  month: number,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsedEmployment = employmentIdSchema.safeParse(employmentId);
  const parsedMonth = monthSchema.safeParse(month);

  if (!parsedEmployment.success || !parsedMonth.success) {
    return { ok: false, error: "Lançamento inválido." };
  }

  await db
    .delete(monthlyEntry)
    .where(
      and(
        eq(monthlyEntry.userId, user.id),
        eq(monthlyEntry.employmentId, parsedEmployment.data),
        eq(monthlyEntry.year, getCurrentPeriod().year),
        eq(monthlyEntry.month, parsedMonth.data),
      ),
    );

  revalidateEntries();
  return { ok: true };
}
