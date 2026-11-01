"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEmployment } from "./actions";

export function EmploymentForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await addEmployment(name);
        if (response.ok) {
          setName("");
        } else {
          setError(response.error);
        }
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="employment-name">Fonte pagadora</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="employment-name"
            maxLength={120}
            placeholder="Nome da empresa ou órgão"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />}
            Adicionar vínculo
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
