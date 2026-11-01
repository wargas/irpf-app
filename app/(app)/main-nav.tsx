"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Painel" },
  { href: "/vinculos", label: "Vínculos" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/despesas", label: "Despesas" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-3 text-sm sm:gap-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            pathname === link.href && "font-medium text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
