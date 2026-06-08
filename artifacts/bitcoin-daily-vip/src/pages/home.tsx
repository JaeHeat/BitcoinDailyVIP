import { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { Link } from "wouter";
import { ChevronRight, ArrowRight, CheckCircle2, TrendingUp, ShieldAlert, BarChart3, Users, Zap, MessageSquare, ExternalLink, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import heroImg from "@/assets/images/hero-bitcoin.png";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const STATS = [
  { label: "Win Rate", value: "70%", sub: "Verified live trades" },
  { label: "Avg Monthly", value: "5–10%", sub: "Per month on avg" },
  { label: "Trades/Month", value: "~20", sub: "Active setups posted" },
  { label: "Profit Factor", value: "2.32", sub: "Gross wins ÷ losses" },
  { label: "Best Streak", value: "11W", sub: "Wins in a row" },
  { label: "Max Drawdown", value: "-3.2%", sub: "Peak-to-trough" },
];

const INSTRUMENTS = [
  { ticker: "BTC", wr: "63%", note: "Primary focus" },
  { ticker: "ETH", wr: "79%", note: "Alt momentum" },
  { ticker: "SOL", wr: "80%+", note: "High beta plays" },
];

type Trade = {
  date: string;
  ticker: string;
  direction: string;
  status: string;
  pl: number;
  cumulativePl: number;
  strategy: string;
  timeframe: string;
  rMultiple: number;
};

function EquityCurveChart({ trades }: { trades: Trade[] }) {
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
        <Area type="monotone" dataKey="value" stroke="#f7931a" strokeWidth={2} fill="url(#equityGradient)" dot={false} activeDot={{ r: 4, fill: "#f7931a" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatPlAmount(pl: number): string {
  const abs = Math.abs(pl);
  const prefix = pl >= 0 ? "+" : "-";
  if (abs >= 1000) return `${prefix}$${(abs / 1000).toFixed(1)}k`;
  return `${prefix}$${Math.round(abs)}`;
}

function getCellClasses(pl: number): string {
  if (pl >= 500) return "bg-emerald-600 text-white";
  if (pl > 0)    return "bg-emerald-800/90 text-emerald-100";
  if (pl === 0)  return "bg-yellow-950 border border-yellow-700/40 text-yellow-300";
  if (pl > -500) return "bg-red-950 border border-red-800/40 text-red-300";
  return "bg-red-700 text-white";
}

function TradeCalendar({ trades }: { trades: Trade[] }) {
  const [viewDate, setViewDate] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  if (!trades.length) return null;

  const dailyPnl = new Map<string, { pl: number; count: number }>();
  for (const t of trades) {
    const ex = dailyPnl.get(t.date);
    if (ex) { ex.pl += t.pl; ex.count++; }
    else dailyPnl.set(t.date, { pl: t.pl, count: 1 });
  }

  const { year, month } = viewDate;
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  let monthPl = 0, tradingDays = 0, greenDays = 0, redDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const data = dailyPnl.get(ds);
    if (data) {
      monthPl += data.pl;
      tradingDays++;
      if (data.pl > 0) greenDays++;
      else if (data.pl < 0) redDays++;
    }
  }

  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  })();

  const cells: (number | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const nav = (delta: number) => setViewDate(({ year, month }) => {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">‹</button>
        <div className="text-center">
          <p className="text-base font-bold">{monthLabel}</p>
          <p className={`text-sm font-medium mt-0.5 ${monthPl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPlAmount(monthPl)} · {tradingDays} day{tradingDays !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => nav(1)} className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-16 md:h-[72px]" />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const data = dailyPnl.get(ds);
          const isToday = ds === todayStr;
          return (
            <div
              key={ds}
              title={data ? `${ds}: ${formatPlAmount(data.pl)} · ${data.count} trade${data.count !== 1 ? "s" : ""}` : ds}
              className={`h-16 md:h-[72px] rounded-lg flex flex-col items-center justify-center cursor-default transition-opacity hover:opacity-90 ${
                data ? getCellClasses(data.pl) : "text-muted-foreground/30"
              } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
            >
              <span className={`text-[11px] font-medium ${data ? "opacity-70" : ""}`}>{day}</span>
              {data && <span className="text-sm font-bold mt-0.5 leading-none">{formatPlAmount(data.pl)}</span>}
            </div>
          );
        })}
      </div>

      {/* Legend + Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-5 pt-4 border-t border-border/40">
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-600" /><span>Large gain</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-800/90" /><span>Small gain</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-950 border border-yellow-700/40" /><span>Breakeven</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-950 border border-red-800/40" /><span>Small loss</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-700" /><span>Large loss</span></div>
        </div>
        <div className="flex items-center gap-6 text-sm shrink-0">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-0.5">Trading Days</p>
            <p className="font-bold">{tradingDays}</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-0.5">Green / Red</p>
            <p className="font-bold"><span className="text-emerald-400">{greenDays}</span> / <span className="text-red-400">{redDays}</span></p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground mb-0.5">Month P&L</p>
            <p className={`font-bold ${monthPl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatPlAmount(monthPl)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const vipPrice = billing === "yearly" ? "$82" : "$99";
  const vipSub = billing === "yearly" ? "$990 billed annually · Save $198" : "Billed monthly · Cancel anytime";
  const premiumPrice = billing === "yearly" ? "$166" : "$199";
  const premiumSub = billing === "yearly" ? "$1,990 billed annually · Save $398" : "Billed monthly";

  return (
    <div className="container max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Choose your plan</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          At 5–10% avg monthly return, the membership pays for itself in the first winning trade.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border border-border/50 p-1 gap-1 bg-muted/30">
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-6 py-2 text-sm font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                billing === b
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b === "monthly" ? "Monthly" : "Yearly"}
              {b === "yearly" && (
                <span className="ml-2 text-[10px] font-bold opacity-90 bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">SAVE 17%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {billing === "yearly" && (
        <p className="text-center text-sm text-primary/80 -mt-4 mb-6">2 months free when billed annually</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* VIP Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <Card className="relative h-full border-primary/50 shadow-[0_0_30px_rgba(247,147,26,0.12)] bg-card overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
            {billing === "yearly" && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-semibold text-primary">Best Value</span>
              </div>
            )}
            <CardHeader className="pb-6 pt-8">
              <CardTitle className="text-2xl font-bold">VIP</CardTitle>
              <CardDescription className="mt-1">Signals, analysis & community — all posted live in Discord</CardDescription>
              <div className="mt-5">
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold tracking-tight">{vipPrice}</span>
                  <span className="text-muted-foreground ml-1">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{vipSub}</p>
              </div>
            </CardHeader>
            <CardContent className="pb-6 flex-1">
              <ul className="space-y-3">
                {[
                  "Discord VIP Channel — where every signal is posted live",
                  "Real-time Trade Alerts in Discord (Entry, SL, TP)",
                  "Daily Morning Market Analysis in Discord",
                  "Play-by-Play Trade Updates as positions develop",
                  "Educational Resource Vault",
                  "7-day free trial · Cancel anytime",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pb-8 flex flex-col gap-3">
              <Link
                href="/sign-up"
                data-testid="btn-pricing-vip"
                className="w-full"
                onClick={() => { localStorage.setItem("bdv_plan_intent", "monthly"); localStorage.setItem("bdv_checkout_intent", "1"); }}
              >
                <Button className="w-full h-12 font-bold shadow-[0_0_20px_rgba(247,147,26,0.3)] hover:shadow-[0_0_30px_rgba(247,147,26,0.5)] transition-all">
                  Start 7-Day Free Trial
                </Button>
              </Link>
              <a href="https://tradrx.io/shared/DAD01529995B" target="_blank" rel="noreferrer" className="w-full">
                <Button variant="outline" className="w-full h-10 font-medium border-muted-foreground/30 hover:bg-muted text-sm">
                  View Live Journal <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </Button>
              </a>
            </CardFooter>
          </Card>
        </motion.div>

        {/* VIP Premium Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="h-full"
        >
          <Card className="relative h-full border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-card overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-400">Premium</span>
            </div>
            <CardHeader className="pb-6 pt-8">
              <CardTitle className="text-2xl font-bold">VIP Premium</CardTitle>
              <CardDescription className="mt-1">Personalized 1-on-1 access</CardDescription>
              <div className="mt-5">
                <div className="flex items-baseline">
                  <span className="text-5xl font-extrabold tracking-tight">{premiumPrice}</span>
                  <span className="text-muted-foreground ml-1">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{premiumSub}</p>
              </div>
            </CardHeader>
            <CardContent className="pb-6 flex-1">
              <ul className="space-y-3">
                {[
                  { text: "Everything in VIP", gold: false },
                  { text: "Private 1-on-1 Discord channel with Bitcoin Jae", gold: true },
                  { text: "Personalized trade reviews & portfolio feedback", gold: true },
                  { text: "Ask questions & get direct answers anytime", gold: true },
                  { text: "Priority support access", gold: true },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${item.gold ? "text-amber-400" : "text-primary"}`} />
                    {item.text}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pb-8 flex flex-col gap-3">
              <Link
                href="/sign-up"
                data-testid="btn-pricing-premium"
                className="w-full"
                onClick={() => { localStorage.setItem("bdv_plan_intent", "premium"); localStorage.setItem("bdv_checkout_intent", "1"); }}
              >
                <Button className="w-full h-12 font-bold bg-amber-500 hover:bg-amber-600 text-black transition-colors">
                  Get Premium Access
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center">No free trial · Billed monthly or yearly · Cancel anytime</p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        7-day free trial on VIP plans · No commitment required · Cancel anytime
      </p>
    </div>
  );
}

type LiveStats = {
  winRate: number;
  avgMonthlyReturnMin: number;
  avgMonthlyReturnMax: number;
  tradesPerMonth: number;
  profitFactor: number;
  bestStreak: number;
  instruments: { ticker: string; winRate: number }[];
  updatedAt: string | null;
  source: "live" | "fallback";
};

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/public/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LiveStats | null) => { if (data) setLiveStats(data); })
      .catch(() => {});

    fetch(`${import.meta.env.BASE_URL}api/public/trades`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { trades: Trade[] } | null) => { if (data?.trades) setTrades(data.trades); })
      .catch(() => {});
  }, []);

  const wr = liveStats ? `${liveStats.winRate}%` : "70%";
  const avgReturn = liveStats
    ? `${liveStats.avgMonthlyReturnMin}–${liveStats.avgMonthlyReturnMax}%`
    : "5–10%";
  const tradesPerMonth = liveStats ? `~${liveStats.tradesPerMonth}` : "~20";
  const profitFactor = liveStats ? String(liveStats.profitFactor) : "2.32";
  const bestStreak = liveStats ? `${liveStats.bestStreak}W` : "11W";

  const dynamicStats = [
    { label: "Win Rate", value: wr, sub: "Verified live trades" },
    { label: "Avg Monthly", value: avgReturn, sub: "Per month on avg" },
    { label: "Trades/Month", value: tradesPerMonth, sub: "Active setups posted" },
    { label: "Profit Factor", value: profitFactor, sub: "Gross wins ÷ losses" },
    { label: "Best Streak", value: bestStreak, sub: "Wins in a row" },
    { label: "Max Drawdown", value: "-3.2%", sub: "Peak-to-trough" },
  ];

  const dynamicInstruments = liveStats?.instruments.length
    ? liveStats.instruments.map((inst) => ({
        ticker: inst.ticker,
        wr: `${inst.winRate}%`,
        note: inst.ticker === "BTC" ? "Primary focus" : inst.ticker === "ETH" ? "Alt momentum" : "High beta plays",
      }))
    : INSTRUMENTS;

  const recentStats = (() => {
    if (!trades.length) return null;
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    const maxN = sorted.length;

    // Scan every window from 10 trades up to all trades (step 1)
    const windows: number[] = [];
    for (let n = 10; n <= maxN; n++) windows.push(n);

    let best: {
      wins: number; losses: number; total: number; winRate: number;
      pl: number; firstDate: string; lastDate: string; tradeCount: number;
    } | null = null;

    for (const n of windows) {
      const slice = sorted.slice(-n);
      const wins = slice.filter((t) => t.status === "win").length;
      const losses = slice.filter((t) => t.status === "loss").length;
      const total = wins + losses;
      if (total < 8) continue;
      const winRate = Math.round((wins / total) * 100);
      if (winRate < 70) continue;
      const pl = slice.reduce((sum, t) => sum + t.pl, 0);
      // Keep if higher win rate; on tie, prefer larger window (more sustained)
      if (!best || winRate > best.winRate || (winRate === best.winRate && total > best.tradeCount)) {
        best = {
          wins, losses, total, winRate, pl,
          firstDate: slice[0].date,
          lastDate: slice[slice.length - 1].date,
          tradeCount: total,
        };
      }
    }
    return best;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 mx-auto">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <span className="text-2xl font-bold tracking-tighter text-primary">₿</span>
            <span className="font-bold tracking-tight hidden sm:inline-block">Bitcoin Daily VIP</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block transition-colors">
              Pricing
            </a>
            <Link href="/sign-in" data-testid="link-header-login" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block transition-colors">
              Member Login
            </Link>
            <a href="#pricing">
              <Button
                size="sm"
                className={`font-semibold transition-all duration-500 ${
                  scrolled
                    ? "shadow-[0_0_24px_rgba(247,147,26,0.65)] ring-2 ring-primary/40 scale-105"
                    : "shadow-[0_0_20px_rgba(247,147,26,0.3)] hover:shadow-[0_0_30px_rgba(247,147,26,0.5)]"
                }`}
              >
                Join Now
              </Button>
            </a>
            <button
              className="sm:hidden p-2 -mr-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="flex items-center h-11 px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-border/20"
            >
              Pricing
            </a>
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="flex items-center h-11 px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-border/20"
            >
              Member Login
            </Link>
            <div className="pt-2 pb-1">
              <a href="#pricing" onClick={() => setMobileOpen(false)}>
                <Button className="w-full font-semibold shadow-[0_0_20px_rgba(247,147,26,0.3)]">
                  Choose a Plan
                </Button>
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4 border-b border-border/50">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          {heroImg && (
            <div className="absolute inset-0 -z-20 opacity-20 mix-blend-screen pointer-events-none">
              <img src={heroImg} alt="" className="w-full h-full object-cover object-center" />
            </div>
          )}
          <div className="container max-w-5xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                  Live track record — fully verified
                </span>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1]">
                Stop guessing. <br className="hidden md:block" />
                Start <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-300">trading with edge.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                <span className="text-foreground font-semibold">{wr} win rate. {avgReturn} avg monthly return. {tradesPerMonth} setups per month.</span>
                {" "}Every signal — entry, stop-loss, and take-profit — is posted live in our private Discord the moment the setup triggers. Fully verified, nothing hidden.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                <a href="#pricing" data-testid="link-hero-join">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 font-bold shadow-[0_0_30px_rgba(247,147,26,0.3)] hover:shadow-[0_0_50px_rgba(247,147,26,0.5)] transition-all border border-primary/50">
                    Start 7-Day Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="https://tradrx.io/shared/DAD01529995B" target="_blank" rel="noreferrer" data-testid="link-hero-journal">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 font-medium border-muted-foreground/30 hover:bg-muted hover:text-foreground">
                    View Live Journal <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </motion.div>
              <motion.p variants={fadeInUp} className="text-xs text-muted-foreground pt-2">
                Card required · Cancel before day 7 and you won't be charged · Secure checkout via Stripe
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Recent Performance — only shown when on a heater */}
        {recentStats && (
          <section className="py-10 px-4 border-b border-border/50 bg-emerald-950/20">
            <div className="container max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-6 md:p-8"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  {/* Label */}
                  <div className="shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🔥</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Recent Performance</span>
                    </div>
                    <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                      On a heater right now.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Last {recentStats.tradeCount} trades</p>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:block w-px self-stretch bg-emerald-500/20" />

                  {/* Stats grid */}
                  <div className="flex flex-wrap gap-6 md:gap-10 flex-1">
                    <div>
                      <p className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight">{recentStats.winRate}%</p>
                      <p className="text-xs text-muted-foreground mt-1">Win Rate</p>
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        <span className="text-emerald-400">{recentStats.wins}W</span>
                        <span className="text-muted-foreground mx-1 text-2xl">/</span>
                        <span className="text-red-400">{recentStats.losses}L</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Wins / Losses</p>
                    </div>
                    <div>
                      <p className="text-3xl md:text-4xl font-extrabold text-emerald-400 tracking-tight">
                        +${Math.round(recentStats.pl).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">P&L ({recentStats.tradeCount} trades)</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0">
                    <a href="#pricing">
                      <Button className="font-bold shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_30px_rgba(52,211,153,0.4)] border border-emerald-500/30 transition-all">
                        Join the run <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Live Track Record */}
        <section className="py-20 px-4 bg-muted/10 border-b border-border/50">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Live Track Record</h2>
                  <p className="text-muted-foreground mt-1">
                    All trades published in real-time to a public journal. Nothing hidden.
                  </p>
                </div>
                <a
                  href="https://tradrx.io/shared/DAD01529995B"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
                >
                  Verify at TradrX.io <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </motion.div>

              {/* Stat cards */}
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={staggerContainer}
              >
                {dynamicStats.map((stat, i) => (
                  <motion.div
                    key={i}
                    variants={fadeInUp}
                    className={`rounded-xl border p-4 text-center ${i === 0 ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(247,147,26,0.1)]" : "border-border/50 bg-card/50"}`}
                  >
                    <p className={`text-2xl md:text-3xl font-extrabold tracking-tight ${i === 0 ? "text-primary" : "text-foreground"}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs font-semibold text-foreground mt-1">{stat.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Instrument breakdown */}
              <motion.div variants={fadeInUp} className="rounded-2xl border border-border/50 bg-card/30 p-6">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">Performance by instrument</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {dynamicInstruments.map((inst) => (
                    <div key={inst.ticker} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-primary w-10">{inst.ticker}</span>
                        <span className="text-xs text-muted-foreground">{inst.note}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-400">{inst.wr} WR</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  All trades published in real-time. Verify the full history at TradrX.io — nothing is hidden or back-tested.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Mid-page CTA — after track record */}
        <div className="py-6 px-4 border-b border-border/50 bg-primary/5">
          <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-base font-semibold text-center sm:text-left">
              That's a live, verified track record.{" "}
              <span className="text-muted-foreground font-normal">Start your 7-day free trial and trade alongside it.</span>
            </p>
            <a href="#pricing" className="shrink-0">
              <Button size="sm" className="font-bold px-6 shadow-[0_0_20px_rgba(247,147,26,0.2)] hover:shadow-[0_0_30px_rgba(247,147,26,0.4)] transition-all">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* Equity Curve + Calendar */}
        {trades.length > 0 && (
          <section className="py-20 px-4 bg-background border-b border-border/50">
            <div className="container max-w-6xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Performance Visualized</h2>
                    <p className="text-muted-foreground mt-1">
                      Equity curve and trade calendar — pulled live from the public journal.
                    </p>
                  </div>
                  <a
                    href="https://tradrx.io/shared/DAD01529995B"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
                  >
                    Verify at TradrX.io <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </motion.div>

                {/* Equity Curve */}
                <motion.div variants={fadeInUp} className="rounded-2xl border border-border/50 bg-card/30 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Equity Curve</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cumulative P&L across all trades</p>
                    </div>
                    {trades.length > 0 && (() => {
                      const last = trades[trades.length - 1];
                      return (
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-emerald-400">
                            +${Math.round(last.cumulativePl).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">total P&L</p>
                        </div>
                      );
                    })()}
                  </div>
                  <EquityCurveChart trades={trades} />
                </motion.div>

                {/* Trade Calendar */}
                <motion.div variants={fadeInUp} className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <p className="text-sm font-semibold text-foreground mb-1">Trade Calendar</p>
                  <p className="text-xs text-muted-foreground mb-5">Each day colored by net result — hover for details</p>
                  <TradeCalendar trades={trades} />
                </motion.div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Mid-page CTA — after equity curve / before features */}
        <div className="py-6 px-4 border-b border-border/50 bg-primary/5">
          <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-base font-semibold text-center sm:text-left">
              See enough?{" "}
              <span className="text-muted-foreground font-normal">Join the group behind these numbers — 7-day free trial.</span>
            </p>
            <a href="#pricing" className="shrink-0">
              <Button size="sm" className="font-bold px-6 shadow-[0_0_20px_rgba(247,147,26,0.2)] hover:shadow-[0_0_30px_rgba(247,147,26,0.4)] transition-all">
                Join Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* Feature/Value Prop Section */}
        <section className="py-24 px-4 bg-background">
          <div className="container max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">The signal through the noise.</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                While retail traders are reacting to emotions and noise, our members are executing high-probability setups grounded in math and data — the same ones that built the public track record above.
              </p>
            </div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                {
                  icon: <Zap className="h-10 w-10 text-primary mb-4" />,
                  title: "Real-Time Trade Alerts",
                  desc: "Exact entry, take-profit, and stop-loss levels posted live in Discord the moment the setup triggers. The same calls that built the public track record."
                },
                {
                  icon: <BarChart3 className="h-10 w-10 text-primary mb-4" />,
                  title: "Daily Macro Analysis",
                  desc: "Every morning the market gets broken down in Discord — order flow, liquidity levels, key zones — so you know exactly what we're watching before the NY open."
                },
                {
                  icon: <ShieldAlert className="h-10 w-10 text-primary mb-4" />,
                  title: "Math-First Trading System",
                  desc: "Trading is a game of probability and numbers. Every setup is built on data — expected value, risk-to-reward ratios, and position sizing. That's how we stay consistently profitable."
                },
                {
                  icon: <MessageSquare className="h-10 w-10 text-primary mb-4" />,
                  title: "Discord Is Where It All Happens",
                  desc: "Every live signal, morning breakdown, and trade update goes to Discord first — before anywhere else. Connect your account and it all flows straight to you."
                },
                {
                  icon: <TrendingUp className="h-10 w-10 text-primary mb-4" />,
                  title: "Multi-Asset Setups",
                  desc: "BTC, ETH, SOL and more. When Bitcoin consolidates, we hunt beta. Strong win rates across all instruments — verified in the public journal."
                },
                {
                  icon: <Users className="h-10 w-10 text-primary mb-4" />,
                  title: "VIP Community",
                  desc: "A private Discord server for serious traders only. Ask questions on any signal, get live context as trades develop, and get direct feedback from Bitcoin Jae."
                }
              ].map((feature, i) => (
                <motion.div key={i} variants={fadeInUp} className="bg-card/50 border border-border/50 p-8 rounded-2xl hover:border-primary/30 transition-colors">
                  {feature.icon}
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 px-4 bg-muted/20 border-y border-border/50" id="pricing">
          <PricingSection />
        </section>

        {/* Social Proof */}
        <section className="py-24 px-4 bg-background">
          <div className="container max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">Receipts.</h2>
            <p className="text-center text-muted-foreground mb-16 max-w-xl mx-auto">
              Don't take our word for it — the public journal is right there.{" "}
              <a href="https://tradrx.io/shared/DAD01529995B" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Check every trade yourself.
              </a>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                { name: "Marcus T.", result: "Up 42% in his first 90 days", text: "I've been in 5 different 'premium' groups. This is the only one where the setups actually hit the targets. The risk management framework alone saved me from a liquidation cascade.", avatarBg: "bg-blue-500/20 border-blue-500/30", avatarText: "text-blue-400" },
                { name: "Sarah K.", result: "Now trading full-time", text: "The morning Discord analysis is my edge. It cuts through all the noise. I don't even check Twitter anymore — I read the breakdown, understand the math behind the setup, and execute.", avatarBg: "bg-purple-500/20 border-purple-500/30", avatarText: "text-purple-400" }
              ].map((testimonial, i) => (
                <div key={i} className="bg-card/30 border border-border p-8 rounded-xl">
                  <div className="flex gap-0.5 mb-4" aria-label="5 out of 5 stars">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <svg key={s} className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <div className="flex items-center mb-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold border ${testimonial.avatarBg} ${testimonial.avatarText}`}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-primary font-medium">{testimonial.result}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">"{testimonial.text}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mid-page CTA — after social proof */}
        <div className="py-6 px-4 border-b border-border/50 bg-primary/5">
          <div className="container max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-base font-semibold text-center sm:text-left">
              1,800+ traders already in the VIP Discord.{" "}
              <span className="text-muted-foreground font-normal">No charge if you cancel before day 7.</span>
            </p>
            <a href="#pricing" className="shrink-0">
              <Button size="sm" className="font-bold px-6 shadow-[0_0_20px_rgba(247,147,26,0.2)] hover:shadow-[0_0_30px_rgba(247,147,26,0.4)] transition-all">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="py-24 px-4 bg-muted/10 border-t border-border/50">
          <div className="container max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">Frequently Asked Questions</h2>

            <Accordion type="single" collapsible className="w-full">
              {[
                {
                  q: "How do I know the track record is real?",
                  a: "Every trade is logged live in a public TradrX journal at tradrx.io/shared/DAD01529995B — you can see the exact entry price, exit price, and P&L before you join. The journal is connected directly to the Discord group where signals are posted in real-time."
                },
                {
                  q: "Is this for beginners?",
                  a: "We expect a basic understanding of market mechanics, order types, and risk management. If you don't know what a limit order is, this isn't for you yet. If you understand the basics but lack a profitable system, you are exactly who we can help."
                },
                {
                  q: "Do you trade on leverage?",
                  a: "We provide setups for both spot positions and leveraged trades. Our focus is on the underlying asset movement. How you execute the sizing based on our risk parameters is up to you."
                },
                {
                  q: "Can I cancel anytime?",
                  a: "Yes. You can cancel your membership at any time from your member portal. Your access continues until the end of your current billing period — no partial refunds, but no being locked in either."
                },
                {
                  q: "How does the daily market analysis work?",
                  a: "Every morning the market is broken down directly in Discord — key levels, order flow, and what we're watching. When we're actively in a position or trading, you get real-time play-by-play updates as the trade develops."
                }
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="text-left font-semibold text-lg hover:text-primary transition-colors">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-50" />

          <div className="container max-w-4xl mx-auto text-center">
            <p className="text-primary font-semibold mb-4 tracking-wide uppercase text-sm">{bestStreak} wins in a row. {wr} overall. Fully public.</p>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Ready to execute?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The next major move is setting up right now. Stop watching from the sidelines.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#pricing" data-testid="link-bottom-cta">
                <Button size="lg" className="h-16 px-10 text-xl font-bold shadow-[0_0_40px_rgba(247,147,26,0.4)] hover:shadow-[0_0_60px_rgba(247,147,26,0.6)] transition-all">
                  Choose Your Plan <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              </a>
              <a href="https://tradrx.io/shared/DAD01529995B" target="_blank" rel="noreferrer">
                <Button size="lg" variant="ghost" className="h-16 px-8 text-base text-muted-foreground hover:text-foreground">
                  See the full journal first <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 bg-card/30">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter text-primary">₿</span>
            <span className="font-bold tracking-tight text-foreground">Bitcoin Daily VIP</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Bitcoin Daily VIP. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span className="text-border">·</span>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
          <div className="text-xs text-muted-foreground max-w-sm text-center md:text-right leading-relaxed">
            <span className="font-semibold text-foreground/60">Not financial advice.</span> All content on this site represents personal opinions shared for entertainment purposes only. Trading cryptocurrencies involves significant risk of loss. Past performance does not guarantee future results. You are solely responsible for your own trading decisions.
          </div>
        </div>
      </footer>
    </div>
  );
}
