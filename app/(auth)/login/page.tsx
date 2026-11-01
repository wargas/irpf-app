import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | IRPF",
};

export default function LoginPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Entre na sua conta
        </h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e sua senha para continuar.
        </p>
      </header>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
