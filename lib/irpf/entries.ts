import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employment, expense, monthlyEntry } from "@/lib/db/schema";

export async function getEmployments(userId: string) {
  return db
    .select({ id: employment.id, name: employment.name })
    .from(employment)
    .where(eq(employment.userId, userId))
    .orderBy(asc(employment.createdAt));
}

export async function getYearEntries(userId: string, year: number) {
  return db.query.monthlyEntry.findMany({
    where: and(eq(monthlyEntry.userId, userId), eq(monthlyEntry.year, year)),
    with: { otherDeductions: true },
  });
}

export async function getYearExpenses(userId: string, year: number) {
  return db
    .select()
    .from(expense)
    .where(and(eq(expense.userId, userId), eq(expense.year, year)))
    .orderBy(desc(expense.date), desc(expense.createdAt));
}

export type StoredEntry = Awaited<ReturnType<typeof getYearEntries>>[number];
