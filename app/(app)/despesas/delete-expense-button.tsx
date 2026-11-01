"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteExpense } from "./actions";

export function DeleteExpenseButton({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-2">
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          Não foi possível excluir.
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={`Excluir ${description}`}
        onClick={() =>
          startTransition(async () => {
            try {
              const response = await deleteExpense(id);
              setFailed(!response.ok);
            } catch {
              setFailed(true);
            }
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
