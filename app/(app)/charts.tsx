"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatAxisValue, formatBRL, formatPercent } from "@/lib/format";

type ChartRow = {
  label: string;
  net: number | null;
  tax: number | null;
  effectiveRate: number | null;
  nominalRate: number | null;
};

const incomeConfig = {
  net: { label: "Após o imposto", color: "var(--chart-1)" },
  tax: { label: "Imposto", color: "var(--chart-2)" },
} satisfies ChartConfig;

const rateConfig = {
  effectiveRate: { label: "Alíquota efetiva", color: "var(--chart-2)" },
  nominalRate: { label: "Faixa da tabela", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

function TooltipValue({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <span
        aria-hidden
        className="h-0.5 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function IncomeChart({ data }: { data: ChartRow[] }) {
  return (
    <ChartContainer config={incomeConfig} className="aspect-auto h-72 w-full">
      <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatAxisValue}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const key = name as keyof typeof incomeConfig;
                return (
                  <TooltipValue
                    label={String(incomeConfig[key].label)}
                    value={formatBRL(Number(value))}
                    color={incomeConfig[key].color}
                  />
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="net"
          stackId="income"
          maxBarSize={24}
          isAnimationActive={false}
          fill="var(--color-net)"
          stroke="var(--card)"
          strokeWidth={2}
          shape={(props) => (
            <Rectangle
              {...props}
              radius={(props.payload as ChartRow).tax ? 0 : [4, 4, 0, 0]}
            />
          )}
        />
        <Bar
          dataKey="tax"
          stackId="income"
          maxBarSize={24}
          isAnimationActive={false}
          fill="var(--color-tax)"
          stroke="var(--card)"
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function RateChart({ data }: { data: ChartRow[] }) {
  return (
    <ChartContainer config={rateConfig} className="aspect-auto h-72 w-full">
      <LineChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatPercent(value)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const key = name as keyof typeof rateConfig;
                return (
                  <TooltipValue
                    label={String(rateConfig[key].label)}
                    value={formatPercent(Number(value))}
                    color={rateConfig[key].color}
                  />
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="nominalRate"
          type="linear"
          isAnimationActive={false}
          stroke="var(--color-nominalRate)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--color-nominalRate)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
        <Line
          dataKey="effectiveRate"
          type="linear"
          isAnimationActive={false}
          stroke="var(--color-effectiveRate)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--color-effectiveRate)", stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
