"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">
          ${payload[0].value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{
            fill: "var(--primary)",
            strokeWidth: 0,
            r: 4,
          }}
          activeDot={{
            fill: "var(--primary)",
            strokeWidth: 2,
            stroke: "var(--background)",
            r: 5,
          }}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
