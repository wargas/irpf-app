const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const axis = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const compactAxis = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatBRL(value: number) {
  return currency.format(value);
}

export function formatDecimal(value: number) {
  return decimal.format(value);
}

export function formatPercent(value: number) {
  return `${percent.format(value)}%`;
}

export function formatAxisValue(value: number) {
  return value >= 10_000 ? compactAxis.format(value) : axis.format(value);
}

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));

// The tax year follows Brazilian time, not the server's time zone.
export function getCurrentPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    date: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  };
}
