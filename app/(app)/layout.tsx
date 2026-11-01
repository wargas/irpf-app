import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { MainNav } from "./main-nav";
import { SignOutButton } from "./sign-out-button";

async function CurrentUser() {
  const user = await getCurrentUser();

  return (
    <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">
      {user.name}
    </span>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            href="/"
            className="hidden font-mono text-sm tracking-widest sm:inline"
          >
            IRPF
          </Link>
          <MainNav />
          <div className="ml-auto flex items-center gap-2">
            <Suspense fallback={null}>
              <CurrentUser />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Simulação com base nos parâmetros publicados pela Receita Federal. Não
          substitui a declaração oficial do imposto de renda.
        </p>
      </footer>
    </div>
  );
}
