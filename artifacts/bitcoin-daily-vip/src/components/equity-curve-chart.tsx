import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Lazy-loaded so the recharts ("charts") chunk stays off the landing's
// critical path — it only downloads when this chart actually renders.
type ChartTrade = { date: string; cumulativePl: number };

export default function EquityCurveChart({ trades }: { trades: ChartTrade[] }) {
  if (!trades.length) return null;

  const byDate = new Map<string, number>();
  for (const t of trades) byDate.set(t.date, t.cumulativePl);

  const data = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }));

  const monthStarts = data.filter((d) => d.date.slice(-2) === "01").map((d) => d.date);
  const ticks = Array.from(new Set([data[0].date, ...monthStarts, data[data.length - 1].date]));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f7931a" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f7931a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
          tickFormatter={(v) => new Date(v + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "rgba(12,12,12,0.97)", border: "1px solid rgba(247,147,26,0.3)", borderRadius: "8px", fontSize: 12 }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Cumulative P&L"]}
          labelFormatter={(label: string) => new Date(label + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        />
        <Area type="monotone" dataKey="value" stroke="#f7931a" strokeWidth={2} fill="url(#equityGradient)" dot={false} activeDot={{ r: 4, fill: "#f7931a" }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
