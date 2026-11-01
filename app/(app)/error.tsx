"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Não foi possível carregar os dados</CardTitle>
        <CardDescription>
          Os parâmetros da Receita Federal ou o banco de dados podem estar
          indisponíveis no momento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => retry()}>Tentar novamente</Button>
      </CardContent>
    </Card>
  );
}
