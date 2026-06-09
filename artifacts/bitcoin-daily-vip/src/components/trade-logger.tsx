import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Undo2 } from "lucide-react";

type Outcome = "win" | "loss" | "be";
type MyTrade = { id: string; outcome: Outcome; r: number; ts: number };

const KEY = "bdv_my_trades";

function load(): MyTrade[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * A dead-simple personal trade journal (localStorage only — no account needed).
 * Members log the trades they actually took so they can see their own running
 * results from following the signals. Reinforces value and feeds testimonials.
 */
export function TradeLogger() {
  const [trades, setTrades] = useState<MyTrade[]>(load);
  const [rInput, setRInput] = useState("");

  function persist(next: MyTrade[]) {
    setTrades(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }

  function log(outcome: Outcome) {
    const mag = Math.abs(parseFloat(rInput));
    const magnitude = Number.isFinite(mag) && mag > 0 ? mag : 1;
    const r = outcome === "be" ? 0 : outcome === "win" ? magnitude : -magnitude;
    // counter-based id avoids Date.now/Math.random; ts is display-only (0 = unknown)
    persist([...trades, { id: `t${trades.length}-${r}`, outcome, r, ts: 0 }]);
    setRInput("");
  }

  function undo() {
    persist(trades.slice(0, -1));
  }

  const wins = trades.filter((t) => t.outcome === "win").length;
  const losses = trades.filter((t) => t.outcome === "loss").length;
  const decided = wins + losses;
  const winRate = decided ? Math.round((wins / decided) * 100) : 0;
  const netR = trades.reduce((s, t) => s + t.r, 0);
  const netRStr = `${netR >= 0 ? "+" : "−"}${Math.abs(netR).toFixed(1)}R`;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">My results</CardTitle>
        </div>
        <CardDescription>Log the trades you take to see your own running record. Saved on this device.</CardDescription>
      </CardHeader>
      <CardContent className="pb-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
            <p className="text-2xl font-extrabold tabular-nums">{trades.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Trades</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
            <p className="text-2xl font-extrabold tabular-nums text-emerald-400">{winRate}%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Win rate</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-center">
            <p className={`text-2xl font-extrabold tabular-nums ${netR >= 0 ? "text-emerald-400" : "text-red-400"}`}>{netRStr}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Net R</p>
          </div>
        </div>

        {/* Log a trade */}
        <div className="rounded-xl border border-border/40 bg-background/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="trade-r" className="text-xs font-medium text-muted-foreground">Result size (R)</label>
            <input
              id="trade-r"
              type="number"
              step="0.1"
              min="0"
              value={rInput}
              onChange={(e) => setRInput(e.target.value)}
              placeholder="e.g. 2"
              aria-label="Trade result in R"
              className="h-8 w-20 rounded-md border border-border/60 bg-background/60 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-[11px] text-muted-foreground">optional — defaults to 1R</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => log("win")} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">Win</Button>
            <Button size="sm" variant="outline" onClick={() => log("loss")} className="border-red-500/30 text-red-400 hover:bg-red-500/10">Loss</Button>
            <Button size="sm" variant="outline" onClick={() => log("be")} className="text-muted-foreground">Breakeven</Button>
          </div>
        </div>

        {trades.length > 0 && (
          <button onClick={undo} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Undo2 className="h-3.5 w-3.5" /> Undo last
          </button>
        )}
      </CardContent>
    </Card>
  );
}
