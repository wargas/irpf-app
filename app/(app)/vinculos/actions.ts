"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { employment } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";

const idSchema = z.string().min(1).max(36);
const nameSchema = z.string().trim().min(1).max(120);

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateEmployments() {
  revalidatePath("/");
  revalidatePath("/lancamentos");
  revalidatePath("/vinculos");
}

async function nameExists(userId: string, name: string, exceptId?: string) {
  const [existing] = await db
    .select({ id: employment.id })
    .from(employment)
    .where(
      and(
        eq(employment.userId, userId),
        sql`lower(${employment.name}) = lower(${name})`,
        exceptId ? ne(employment.id, exceptId) : undefined,
      ),
    );
  return existing !== undefined;
}

export async function addEmployment(input: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const name = nameSchema.safeParse(input);

  if (!name.success) {
    return { ok: false, error: "Informe o nome da fonte pagadora." };
  }
  if (await nameExists(user.id, name.data)) {
    return { ok: false, error: "Já existe um vínculo com este nome." };
  }

  await db.insert(employment).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name: name.data,
  });

  revalidateEmployments();
  return { ok: true };
}

export async function renameEmployment(
  id: string,
  input: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsedId = idSchema.safeParse(id);
  const name = nameSchema.safeParse(input);

  if (!parsedId.success || !name.success) {
    return { ok: false, error: "Informe o nome da fonte pagadora." };
  }
  if (await nameExists(user.id, name.data, parsedId.data)) {
    return { ok: false, error: "Já existe um vínculo com este nome." };
  }

  await db
    .update(employment)
    .set({ name: name.data })
    .where(and(eq(employment.id, parsedId.data), eq(employment.userId, user.id)));

  revalidateEmployments();
  return { ok: true };
}

export async function deleteEmployment(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const parsedId = idSchema.safeParse(id);

  if (!parsedId.success) {
    return { ok: false, error: "Vínculo inválido." };
  }

  await db
    .delete(employment)
    .where(and(eq(employment.id, parsedId.data), eq(employment.userId, user.id)));

  revalidateEmployments();
  return { ok: true };
}
