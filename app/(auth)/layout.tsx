export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-5"
        />
        <span className="relative font-mono text-sm tracking-widest">IRPF</span>
        <p className="relative max-w-md text-4xl leading-tight font-semibold tracking-tight">
          Imposto de renda, sem complicação.
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <span className="-mb-6 font-mono text-sm tracking-widest lg:hidden">
            IRPF
          </span>
          {children}
        </div>
      </section>
    </main>
  );
}
