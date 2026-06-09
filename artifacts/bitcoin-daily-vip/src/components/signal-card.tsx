import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export type SignalSpec = {
  ticker: string;
  direction: "LONG" | "SHORT";
  entry: string;
  stop: string;
  tp1: string;
  tp2: string;
  risk: string; // e.g. "1%"
  rr: string; // e.g. "1 : 3"
  note?: string;
};

export const SAMPLE_SIGNAL: SignalSpec = {
  ticker: "BTC/USDT",
  direction: "LONG",
  entry: "64,200",
  stop: "63,400",
  tp1: "65,500",
  tp2: "66,800",
  risk: "1%",
  rr: "1 : 3",
  note: "Reclaim of the daily level with momentum confirmation.",
};

const FIELD_HELP: Record<string, string> = {
  Entry: "Where to open the trade",
  "Stop loss": "Where to exit if wrong — caps your loss",
  "Take profit 1": "First target — take partial profit",
  "Take profit 2": "Second target — the runner",
};

/**
 * The anatomy of a trade signal. Used as a sample on the landing page and as a
 * "how to read a signal" reference in the member portal (pass annotated).
 */
export function SignalCard({
  signal = SAMPLE_SIGNAL,
  annotated = false,
}: {
  signal?: SignalSpec;
  annotated?: boolean;
}) {
  const isLong = signal.direction === "LONG";
  const dirColor = isLong
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : "text-red-400 bg-red-500/10 border-red-500/30";

  const rows: { label: string; value: string; accent: string }[] = [
    { label: "Entry", value: signal.entry, accent: "text-foreground" },
    { label: "Stop loss", value: signal.stop, accent: "text-red-400" },
    { label: "Take profit 1", value: signal.tp1, accent: "text-emerald-400" },
    { label: "Take profit 2", value: signal.tp2, accent: "text-emerald-400" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-[0_0_30px_rgba(0,0,0,0.25)] w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-bold tracking-tight">{signal.ticker}</span>
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${dirColor}`}>
            {isLong ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {signal.direction}
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Signal</span>
      </div>

      {/* Levels */}
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-muted-foreground">{r.label}</span>
              {annotated && FIELD_HELP[r.label] && (
                <p className="text-[11px] text-muted-foreground/70 leading-tight">{FIELD_HELP[r.label]}</p>
              )}
            </div>
            <span className={`font-mono font-bold tabular-nums ${r.accent}`}>${r.value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Risk <span className="font-semibold text-foreground">{signal.risk}</span> of account
        </span>
        <span className="text-muted-foreground">
          R:R <span className="font-semibold text-primary">{signal.rr}</span>
        </span>
      </div>

      {signal.note && (
        <p className="mt-3 text-xs text-muted-foreground/80 italic leading-relaxed">{signal.note}</p>
      )}
    </div>
  );
}
