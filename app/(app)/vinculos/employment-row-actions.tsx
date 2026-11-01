"use client";

import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteEmployment, renameEmployment } from "./actions";

export function EmploymentName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await renameEmployment(id, value);
        if (response.ok) {
          setEditing(false);
        } else {
          setError(response.error);
        }
      } catch {
        setError("Não foi possível salvar.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="font-medium">{name}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Renomear ${name}`}
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          aria-label={`Novo nome de ${name}`}
          maxLength={120}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-40"
          autoFocus
          required
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label="Salvar nome"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancelar"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          <X />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs whitespace-normal text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function DeleteEmploymentButton({
  id,
  name,
  entries,
}: {
  id: string;
  name: string;
  entries: number;
}) {
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const warning =
      entries > 0
        ? `Excluir "${name}" e todos os lançamentos deste vínculo, de qualquer ano? Esta ação não pode ser desfeita.`
        : `Excluir "${name}"?`;

    if (!window.confirm(warning)) return;

    startTransition(async () => {
      try {
        const response = await deleteEmployment(id);
        setFailed(!response.ok);
      } catch {
        setFailed(true);
      }
    });
  }

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
        aria-label={`Excluir ${name}`}
        onClick={handleDelete}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
