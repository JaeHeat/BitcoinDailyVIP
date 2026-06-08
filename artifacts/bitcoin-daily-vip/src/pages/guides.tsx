import { useState, useEffect } from "react";
import {
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  Shield,
  Zap,
  BookOpen,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";

const TABS = [
  { id: "101", label: "Prop Firms 101" },
  { id: "exchange", label: "Exchange Setup" },
  { id: "klein", label: "Klein Funding" },
  { id: "hyro", label: "HyroTrader" },
  { id: "compare", label: "Comparison" },
  { id: "strategy", label: "Strategy & Risk" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Shared primitives ─────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function InfoBox({ children, color = "amber" }: { children: React.ReactNode; color?: "amber" | "blue" | "emerald" | "red" }) {
  const colors = {
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    red: "border-red-500/20 bg-red-500/5 text-red-400",
  };
  return (
    <div className={`rounded-xl border px-4 py-3.5 mb-5 ${colors[color]}`}>
      {children}
    </div>
  );
}

function RuleRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-sm ${highlight ? "bg-primary/8 border border-primary/20" : "odd:bg-muted/10"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
        {n}
      </div>
      <div>
        <p className="font-semibold text-sm mb-1">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function RefLink({ href, label, sub }: { href: string; label: string; sub?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 hover:border-primary/50 hover:bg-primary/10 transition-colors group"
    >
      <div>
        <p className="font-semibold text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <ExternalLink className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
    </a>
  );
}

// ─── TAB: Prop Firms 101 ──────────────────────────────────────────────────

function Tab101() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={BookOpen} title="What Are Prop Firms?" subtitle="The model, why they exist, and how you make money." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Their capital", desc: "You trade a funded account — their money, not yours. Your personal savings are never at risk." },
          { title: "Your edge", desc: "You provide disciplined, rule-based execution. If you prove you can follow risk rules, you get paid." },
          { title: "Shared profits", desc: "You keep 70–100% of profits depending on the firm. One-time challenge fee — refunded on first payout." },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-border/50 bg-card/30 p-4">
            <p className="font-bold text-sm text-primary mb-1">{c.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3">The Universal Challenge Structure</h3>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          {[
            ["Starting Balance", "The funded capital you trade — $5K to $200K depending on your plan"],
            ["Profit Target", "The % gain required to pass (typically 6–10% of balance)"],
            ["Max Overall Drawdown", "Total loss limit from starting balance — breach this and the account fails"],
            ["Daily Loss Limit", "Maximum loss in a single day — also causes immediate failure if breached"],
          ].map(([k, v], i) => (
            <div key={k} className={`flex gap-3 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
              <span className="font-semibold text-foreground min-w-[180px] shrink-0">{k}</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">You pass by reaching the target without violating risk limits. Breach a limit once and access is gone — there is no negotiation.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-3">The Mindset Shift</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Retail Thinking ✗</p>
            {["How fast can I hit the target?", "Let me size up to speed this up.", "I'll recover that loss quickly.", "I need to pass this challenge."].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Professional Thinking ✓</p>
            {["What is my maximum allowable loss today?", "What is my risk per trade vs drawdown?", "Am I operating inside limits?", "If I avoid disqualification, the math plays out."].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InfoBox color="blue">
        <p className="text-sm font-semibold mb-1">The core truth</p>
        <p className="text-sm text-muted-foreground/90">Funded accounts are about proving one thing: <span className="text-foreground font-medium">can you operate inside strict risk boundaries without breaking them?</span> The firm is not asking if you're talented — it's asking if you're disciplined. Most failures don't happen from bad setups. They happen from emotional decisions near risk limits.</p>
      </InfoBox>

      <div>
        <h3 className="font-semibold mb-3">Think in 10 Attempts — Not 1</h3>
        <p className="text-sm text-muted-foreground mb-4">Professionals don't ask "will I pass?" They ask "what happens if I repeat this 10 times?" You don't need to pass every attempt. You need the total wins to outweigh the total costs.</p>
        <div className="rounded-xl border border-border/40 bg-card/20 overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2 bg-muted/20">
            <span>Scenario</span><span>8 Fails</span><span>2 Passes</span><span>Net</span>
          </div>
          {[
            ["$13K account @ $120/attempt", "8 × $120 = $960 cost", "2 × $1,040 profit split", "+$1,120 net"],
            ["$25K account @ $300/attempt", "8 × $300 = $2,400 cost", "2 × $2,000 profit split", "+$1,600 net"],
          ].map(([s, f, p, n]) => (
            <div key={s} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm border-t border-border/30">
              <span className="text-foreground font-medium">{s}</span>
              <span className="text-muted-foreground">{f}</span>
              <span className="text-emerald-400">{p}</span>
              <span className="text-primary font-semibold">{n}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">Numbers are illustrative. Pass rates and profit splits vary by firm and trader.</p>
      </div>
    </div>
  );
}

// ─── TAB: Exchange Setup ──────────────────────────────────────────────────

function TabExchange() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={TrendingUp} title="Exchange Setup Guide" subtitle="Bybit for most countries · BloFin for US & restricted regions." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
        <RefLink href="https://partner.bybit.com/b/bitcoindaily" label="Sign Up on Bybit" sub="Up to $30,000 in bonuses · Referral link" />
        <RefLink href="https://partner.blofin.com/d/BitcoinDaily" label="Sign Up on BloFin" sub="Up to $1,000 in bonuses · No KYC · US-accessible" />
      </div>

      <div>
        <h3 className="font-semibold mb-4">Bybit — Step-by-Step Setup</h3>
        <Step n={1} title="Create Your Account">Go to <span className="text-primary font-medium">partner.bybit.com/b/bitcoindaily</span> and click Sign Up. Use your email and a strong password.</Step>
        <Step n={2} title="Complete KYC (Identity Verification)">Go to Account → Verification. You'll need a government-issued ID and selfie. Usually takes 5–30 minutes. Complete this before depositing.</Step>
        <Step n={3} title="Enable 2FA">Go to Account → Security and enable 2FA with an authenticator app (Google Authenticator or Authy). Required for withdrawals.</Step>
        <Step n={4} title="Deposit USDT">Go to Assets → Deposit. USDT on TRC-20 is cheapest for network fees. Only deposit what you're comfortable risking.</Step>
        <Step n={5} title="Transfer to Unified Trading Account">Go to Assets → Transfer and move USDT from Funding Wallet to your Unified Trading Account (UTA). This is where you trade from.</Step>
        <Step n={6} title="Navigate to Futures">Click Trade → Derivatives → USDT Perpetual. Search for the asset from the signal (e.g. BTCUSDT, SOLUSDT).</Step>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Placing a Trade — Step by Step</h3>
        <Step n={1} title="Set Leverage to Isolated">Find the leverage button and set to the signal's range. <span className="text-amber-400 font-medium">Always use Isolated Margin</span> — never Cross. This caps your max loss to that trade only.</Step>
        <Step n={2} title="Select Limit Order">In the order panel, choose Limit (not Market). For a SHORT, click Sell/Short. Limit orders fill at your price or better.</Step>
        <Step n={3} title="Calculate and Enter Position Size">Calculate quantity using the position sizing formula — never guess. Enter this in the quantity field.</Step>
        <Step n={4} title="Enter Entry Price">Type the signal's entry price in the Price field. Your order waits open until price reaches it.</Step>
        <Step n={5} title="Set TP/SL Before Confirming">Click TP/SL before you hit confirm. Set: Stop Loss trigger = <span className="text-foreground font-medium">Mark Price</span> · Take Profit trigger = <span className="text-foreground font-medium">Last Price</span>. Mark Price stops prevent wick fakeouts.</Step>
        <Step n={6} title="Review and Confirm">Check: entry price · quantity · stop loss · take profit · leverage · Isolated margin. Then confirm. Log the trade in TradrX when it closes: <span className="text-primary">tradrx.io</span></Step>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Key Settings</h3>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          {[
            ["Margin Mode", "Isolated (always)", "Caps max loss to that trade's margin only"],
            ["Order Type", "Limit (preferred)", "Fills at your price, not the market's"],
            ["SL Trigger", "Mark Price", "Prevents wick-based false stops"],
            ["TP Trigger", "Last Price", "Ensures TP fills at real traded price"],
            ["Leverage", "Follow signal's range", "Never exceed what the signal specifies"],
            ["Position Mode", "One-Way Mode", "Simpler for beginners — one position per asset"],
          ].map(([s, v, w], i) => (
            <div key={s} className={`grid grid-cols-3 gap-3 px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
              <span className="text-muted-foreground">{s}</span>
              <span className="font-semibold text-primary">{v}</span>
              <span className="text-muted-foreground text-xs">{w}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Common Beginner Mistakes</h3>
        <div className="space-y-2">
          {[
            ["Using Cross Margin instead of Isolated", "Cross margin uses your entire account as collateral — one bad trade can wipe everything."],
            ["Forgetting to set the Stop Loss", "Once you're in the trade without a stop, you're fully exposed. Set TP/SL at the same time as the order."],
            ["Using Market Orders at peak volatility", "Market orders can fill $10–$50+ away from your expected price. Use Limit Orders."],
            ["Setting the wrong direction", "On a SHORT signal, click Sell/Short — not Buy/Long. Double-check before every order."],
            ["Closing manually instead of letting TP/SL work", "If your TP and SL are set, you don't need to babysit the trade. Let the system do its job."],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-3">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Pre-Trade Checklist</h3>
        <p className="text-sm text-muted-foreground mb-3">Run through this every time before placing an order.</p>
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 space-y-2">
          {[
            "I am on the correct asset (e.g. SOLUSDT, not SOLBTC)",
            "Margin mode is set to ISOLATED",
            "Leverage is set to the signal's recommended range",
            "I am on the correct side: SELL/SHORT or BUY/LONG",
            "Order type is set to LIMIT",
            "Entry price is entered correctly",
            "Quantity is calculated using the position sizing formula — not guessed",
            "Stop Loss is entered in the TP/SL field (not added after the fact)",
            "Take Profit (TP1) is entered in the TP/SL field",
            "Stop Loss trigger set to Mark Price · Take Profit trigger set to Last Price",
            "I have reviewed all fields before clicking confirm",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">BloFin Setup (Restricted Countries)</h3>
        <p className="text-sm text-muted-foreground mb-4">If Bybit is unavailable in your country (e.g. US), BloFin is the recommended alternative. The interface and order placement work identically to Bybit.</p>
        <Step n={1} title="Create Account">Go to <span className="text-primary font-medium">partner.blofin.com/d/BitcoinDaily</span> and sign up with your email. Use the Bitcoin Daily referral link to claim your welcome bonus.</Step>
        <Step n={2} title="KYC Verification">Navigate to Profile → Verification. Submit your government ID. Typically clears within 30 minutes.</Step>
        <Step n={3} title="Enable 2FA">Go to Profile → Security and link an authenticator app.</Step>
        <Step n={4} title="Deposit USDT">Go to Assets → Deposit. TRC-20 has lower network fees. Confirm the deposit address carefully before sending.</Step>
        <Step n={5} title="Place Trades">Click Trade → Futures and search your asset. The order placement process is identical to Bybit: Isolated margin · Limit order · Set TP/SL before confirming.</Step>
      </div>
    </div>
  );
}

// ─── TAB: Klein Funding ───────────────────────────────────────────────────

function TabKlein() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={Shield} title="Klein Funding Setup Guide" subtitle="Connect your Bybit account, understand the rules, and pass your challenge." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RefLink href="https://kleinfunding.com" label="Get Funded with Klein" sub="Use code btcdaily for 10% off at checkout" />
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Discount Code</p>
          <p className="text-2xl font-bold text-primary tracking-widest">btcdaily</p>
          <p className="text-xs text-muted-foreground">Enter at checkout for 10% off any Klein challenge</p>
        </div>
      </div>

      <InfoBox color="amber">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Use a Bybit Sub-Account on Demo Mode</p>
        <p className="text-sm text-muted-foreground/90">Klein connects to Bybit <span className="text-foreground font-medium">Demo trading</span> — not your live account. Create a new Bybit sub-account, switch it to Demo mode, and generate the API from there. Connecting your live account will not work.</p>
      </InfoBox>

      <div>
        <h3 className="font-semibold mb-4">Setup — Step by Step</h3>
        <Step n={1} title="Create a Bybit Sub-Account">Log in to Bybit → Sub-Accounts → Create Sub-Account. Name it something like <em>Klein13k</em>. Keep this sub-account clean and use it only for the Klein challenge.</Step>
        <Step n={2} title="Switch to Demo Trading">Inside the sub-account, switch to the Demo Trading environment (top menu in Bybit). Do not use regular live trading mode.</Step>
        <Step n={3} title="Generate an API Key (Demo Mode)">While in Demo mode: go to API Management → Create New API. Set permissions to: Read ON · Write ON. Save both your API Key and Secret Key immediately.</Step>
        <Step n={4} title="Connect API to Klein Dashboard">Go to your Klein dashboard and paste in the API Key and Secret Key. Hit Confirm. Klein will update your demo sub-account with the correct challenge balance.</Step>
        <Step n={5} title="Trade Only USDT Futures Pairs">Klein supports USDT Perpetual futures on Bybit's 700+ pairs. <span className="text-red-400 font-medium">Do not trade USD or regular Perpetual contracts</span> — only USDT pairs. Trading the wrong product breaches the rules.</Step>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Challenge Rules</h3>
        <div className="space-y-1.5">
          <RuleRow label="Profit Target" value="Equal to your chosen drawdown (e.g. 6% DD = 6% target)" />
          <RuleRow label="Max Overall Drawdown" value="Your chosen level: 6–14%" highlight />
          <RuleRow label="Daily Drawdown" value="50% of your overall drawdown (resets 12:05 AM UTC)" highlight />
          <RuleRow label="Min Trading Days" value="0 on 1-step · 0 on 2/3-step" />
          <RuleRow label="Time Limit" value="None" />
          <RuleRow label="Profit Split" value="40–100% depending on plan" />
          <RuleRow label="Max Capital" value="$300,000" />
          <RuleRow label="Leverage" value="Up to 1:100 via Bybit" />
          <RuleRow label="Weekend Holds" value="Allowed" />
          <RuleRow label="News Trading" value="Permitted" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">Klein uses a stability score: 30% on 1-step · 45% on 2/3-step. Check your Klein dashboard for the current stability criteria.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Allowed vs Not Allowed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Allowed ✓</p>
            {["USDT Perpetual trading via Bybit", "700+ USDT perpetual pairs", "News trading", "Overnight and weekend holds", "Multiple pairs simultaneously"].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Not Allowed ✗</p>
            {["Copy trading or shared accounts", "EAs or automated systems", "High-frequency arbitrage", "USD or non-USDT contract types", "Martingale / averaging into losers", "Any exploit or unfair advantage"].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">What Causes Automatic Failure</h3>
        <div className="space-y-2">
          {[
            "Balance hitting the max total drawdown limit",
            "Exceeding the daily loss limit — even unrealized losses count",
            "Trading disallowed product types (USD/non-USDT futures)",
            "Using automated strategies, copy trading, or shared accounts",
            "Breaking any listed trading restriction",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{t}</p>
            </div>
          ))}
        </div>
      </div>

      <InfoBox color="blue">
        <p className="text-sm text-muted-foreground/90"><span className="text-foreground font-semibold">Always check your Klein dashboard</span> for the most current rules — parameters can update. Always trade with the most recent rule sheet.</p>
      </InfoBox>
    </div>
  );
}

// ─── TAB: HyroTrader ─────────────────────────────────────────────────────

function TabHyro() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={Zap} title="HyroTrader Setup Guide" subtitle="Real Bybit order books · No synthetic feeds · Free 10-day trial." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RefLink href="https://www.hyrotrader.com/?coupon=btcdaily" label="Start on HyroTrader" sub="Free 10-day trial · Use code btcdaily for 10% off" />
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Discount Code</p>
          <p className="text-2xl font-bold text-primary tracking-widest">btcdaily</p>
          <p className="text-xs text-muted-foreground">10% off any paid challenge + free 10-day trial</p>
        </div>
      </div>

      <InfoBox color="emerald">
        <p className="text-sm font-semibold mb-1">Real Bybit execution — no synthetic feeds</p>
        <p className="text-sm text-muted-foreground/90">Most prop firms run crypto on simulated price feeds with fake wicks. HyroTrader connects directly to real Bybit order books via API. The price you see is the price every Bybit user sees — no surprises when you go funded.</p>
      </InfoBox>

      <div>
        <h3 className="font-semibold mb-3">Account Sizes & Fees</h3>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2.5 bg-muted/20">
            <span>Account</span><span>1-Step Fee</span><span>10% Target</span><span>Best For</span>
          </div>
          {[
            ["$10,000", "$199", "$1,000", "Starting out"],
            ["$25,000", "$399", "$2,500", "Experienced traders"],
            ["$50,000", "$699", "$5,000", "Solid track record"],
            ["$100,000", "$999", "$10,000", "Strong consistent edge"],
            ["$200,000", "$1,399", "$20,000", "Max capital from day one"],
          ].map(([a, f, t, b], i) => (
            <div key={a} className={`grid grid-cols-4 gap-3 px-4 py-2.5 text-sm border-t border-border/30 ${i === 0 ? "bg-primary/5" : ""}`}>
              <span className="font-semibold text-foreground">{a}</span>
              <span className="text-muted-foreground">{f}</span>
              <span className="text-primary font-medium">{t}</span>
              <span className="text-muted-foreground text-xs">{b}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">All fees are one-time and fully refunded with your first funded payout. Challenge costs you nothing if you pass.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Setup — Step by Step</h3>
        <Step n={1} title="Start the Free Trial">Go to <span className="text-primary font-medium">hyrotrader.com</span> → Get Started. Select your challenge type (1-Step recommended) and account size. Apply code <span className="font-bold text-primary">btcdaily</span> at checkout for 10% off.</Step>
        <Step n={2} title="Choose Your Platform">Select Bybit (most countries) or Cleo (US traders — see below). If using Bybit, proceed to Step 3.</Step>
        <Step n={3} title="Connect Bybit API — Use the DEMO Account">Log in to Bybit → switch to Demo Trading environment (top menu). Go to Profile → API → Create New Key. Set permissions: Read · Write · Unified · Assets — all four. Copy both API Key and Secret Key. Paste into HyroTrader dashboard.</Step>
        <Step n={4} title="Confirm No Open Trades">Before connecting the API, ensure there are no open positions or limit orders in the demo account. Clean state required.</Step>
        <Step n={5} title="Start Trading">Once connected, trade on Bybit Demo as normal. HyroTrader tracks all activity in real time against the challenge rules.</Step>
      </div>

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm font-semibold text-blue-400 mb-2">🇺🇸 US Traders — Use Cleo</p>
        <p className="text-sm text-muted-foreground mb-3">Because Bybit restricts US access, HyroTrader offers Cleo as an alternative. Cleo runs on Binance's live market data and gives you access to the same rules and funded account path — no API setup needed.</p>
        <div className="space-y-1.5">
          <RuleRow label="Data Feed" value="Binance live market data" />
          <RuleRow label="Account Setup" value="Automatic — no API key needed" />
          <RuleRow label="Same Rules?" value="Yes — identical evaluation rules" />
          <RuleRow label="API Trading" value="Not available on Cleo" />
          <RuleRow label="Hedging" value="Not supported on Cleo" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Challenge Rules (1-Step)</h3>
        <div className="space-y-1.5">
          <RuleRow label="Profit Target" value="10% of initial balance" highlight />
          <RuleRow label="Max Drawdown (eval)" value="6%" highlight />
          <RuleRow label="Daily Drawdown (eval)" value="5%" highlight />
          <RuleRow label="Min Trading Days" value="10" />
          <RuleRow label="Max Risk per Trade" value="3% of initial balance" />
          <RuleRow label="Max Exposure" value="25%" />
          <RuleRow label="Time Limit" value="None" />
          <RuleRow label="Weekend Holds" value="Allowed" />
          <RuleRow label="Profit Split" value="70% starting → 90% over time" />
          <RuleRow label="Payout Speed" value="12–48 hours in USDT or USDC" />
        </div>
      </div>

      <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
        <p className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />The Stop-Loss Rule — The #1 Account Killer</p>
        <p className="text-sm text-muted-foreground mb-3">A stop-loss is mandatory on every trade and must be set within <span className="text-foreground font-bold">5 minutes</span> of entry using Bybit's TP/SL tool specifically. Conditional orders do not count.</p>
        <div className="space-y-1.5">
          <RuleRow label="Time Limit" value="Set SL within 5 minutes of entry" />
          <RuleRow label="Tool Required" value="Bybit TP/SL tool only" />
          <RuleRow label="If You Edit SL" value="Edit it — never cancel. Cancel = instant breach" />
          <RuleRow label="First Violation" value="Soft breach — 1 hour to fix before fail" />
          <RuleRow label="Second Violation" value="Immediate account failure, no warning" />
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">What Will Fail Your Account</h3>
        <div className="space-y-2">
          {[
            ["No SL set within 5 min", "Soft breach once. Second time = instant fail"],
            ["Cancel SL without closing position", "Treated as no SL — same breach process"],
            ["Daily or max drawdown exceeded", "Immediate failure, no warnings"],
            ["Low-cap altcoin >5% exposure", "Coins under $100M mcap or $5M daily volume"],
            ["Martingale / averaging into losers", "Strictly prohibited — account terminated"],
            ["Cross-account hedging", "Prohibited across all accounts"],
            ["Copy trading during evaluation", "Not allowed"],
            ["One day = >40% of total profit (eval only)", "Profit distribution rule — need to keep trading to normalize"],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-3 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-2.5">
              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{t}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Comparison ─────────────────────────────────────────────────────

function TabCompare() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={BarChart2} title="Klein vs HyroTrader" subtitle="Both are official Bitcoin Daily partners. Both use real Bybit execution. Here's how to choose." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RefLink href="https://kleinfunding.com" label="Klein Funding" sub="Use code btcdaily for 10% off" />
        <RefLink href="https://www.hyrotrader.com/?coupon=btcdaily" label="HyroTrader" sub="Use code btcdaily for 10% off · Free trial" />
      </div>

      <div>
        <h3 className="font-semibold mb-3">Head-to-Head</h3>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2.5 bg-muted/20">
            <span>Feature</span><span className="text-center">Klein</span><span className="text-center">HyroTrader</span>
          </div>
          {[
            ["Profit Target (1-Step)", "= Drawdown you choose (6–14%)", "10% fixed"],
            ["Max Drawdown (1-Step)", "6–14% (you choose)", "6%"],
            ["Daily Drawdown", "50% of overall DD", "5%"],
            ["Min Trading Days", "0 (1-step)", "10"],
            ["Profit Split", "40–100%", "70–90%"],
            ["Max Capital", "$300,000", "$200,000"],
            ["Time Limit", "None", "None"],
            ["Weekend Holds", "✓ Allowed", "✓ Allowed"],
            ["News Trading", "✓ Permitted", "✓ Permitted"],
            ["Free Trial", "No", "10 days free"],
            ["US Traders (Cleo)", "No", "✓ Yes"],
            ["Stop-Loss Rule", "Recommended best practice", "Mandatory within 5 min"],
            ["Discount Code", "btcdaily", "btcdaily"],
          ].map(([feat, klein, hyro], i) => (
            <div key={feat} className={`grid grid-cols-3 gap-3 px-4 py-2.5 text-sm border-t border-border/30 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
              <span className="text-muted-foreground">{feat}</span>
              <span className="text-center font-medium text-foreground">{klein}</span>
              <span className="text-center font-medium text-foreground">{hyro}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">What They Share</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "Crypto only — USDT perpetual futures",
            "Real Bybit order books — no synthetic feeds",
            "700+ USDT pairs via Bybit",
            "Leverage up to 1:100",
            "Zero spread — Bybit maker/taker fees only",
            "Challenge fee refunded on first funded payout",
            "No time limit on evaluation",
            "Payout in USDT/USDC within 12–24 hours",
            "Martingale strictly prohibited",
            "Arbitrage/HFT prohibited",
            "Officially partnered with @bitcoin.daily",
            "Personal capital never at risk",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/50 bg-card/20 p-4">
          <p className="text-sm font-bold mb-2">Pick Klein if…</p>
          <div className="space-y-1.5">
            {[
              "You want to choose your own drawdown level",
              "You want no minimum trading days",
              "You want access to $300K max capital",
              "You want 100% profit split potential",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/20 p-4">
          <p className="text-sm font-bold mb-2">Pick HyroTrader if…</p>
          <div className="space-y-1.5">
            {[
              "You're in the US (Cleo platform available)",
              "You want a free 10-day trial before paying",
              "You prefer a simpler fixed-rule structure",
              "You want to scale up to $1M funded capital",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Strategy & Risk ─────────────────────────────────────────────────

function TabStrategy() {
  return (
    <div className="space-y-8">
      <SectionTitle icon={TrendingUp} title="Prop Firm Strategy & Risk" subtitle="The framework that makes failing statistically difficult." />

      <InfoBox color="blue">
        <p className="text-sm font-semibold mb-1">Core Philosophy</p>
        <p className="text-sm text-muted-foreground/90">Most traders approach challenges trying to win. This strategy approaches challenges trying <span className="text-foreground font-medium">not to lose</span>. When you stop blowing accounts, passing becomes inevitable over time.</p>
      </InfoBox>

      <div>
        <h3 className="font-semibold mb-3">Risk Per Trade — The Foundation</h3>
        <p className="text-sm text-muted-foreground mb-4">Everything is built on one number: how much you risk per trade. Get this wrong and no system saves you.</p>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2.5 bg-muted/20">
            <span>Streak</span><span className="text-red-400">2% Risk (Aggressive)</span><span className="text-emerald-400">1% Risk (Controlled)</span>
          </div>
          {[
            ["After 1 loss", "-2.0% DD", "-1.0% DD"],
            ["After 3 losses", "-5.9% DD", "-3.0% DD"],
            ["After 5 losses", "-9.6% DD ⚠️", "-4.9% DD ✓"],
          ].map(([s, a, c], i) => (
            <div key={s} className={`grid grid-cols-3 gap-3 px-4 py-2.5 text-sm border-t border-border/30 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
              <span className="text-muted-foreground">{s}</span>
              <span className="text-red-400 font-medium">{a}</span>
              <span className="text-emerald-400 font-medium">{c}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">On a 6% max drawdown challenge, 5 consecutive losses at 2% risk nearly triggers failure. At 1% risk, you survive comfortably.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-3">The Risk Ladder — Adaptive System</h3>
        <p className="text-sm text-muted-foreground mb-4">Risk adjusts to your account condition — not to your emotions. No manual adjustments. Only mechanical, level-based responses.</p>
        <div className="space-y-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-red-400 text-sm">🔴 Defensive Mode</p>
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">0.5% Risk</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Account down 4–5%</p>
            <p className="text-xs text-muted-foreground">Smallest possible size. Only highest-quality setups. Stop the bleeding — do not try to recover fast. That kills accounts.</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-foreground text-sm">⚪ Neutral Mode</p>
              <span className="text-xs font-bold text-foreground bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">1% Risk</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Account near breakeven — your default state</p>
            <p className="text-xs text-muted-foreground">Standard position size. Normal setup criteria. No urgency. Build profit cushion methodically, not aggressively.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-emerald-400 text-sm">🟢 Offensive Mode</p>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">1.25–1.5% Risk</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-medium">Account up 3–5%</p>
            <p className="text-xs text-muted-foreground">Slight increase only — cushion earned this. Same setup quality, slightly more exposure. Cushion is not a license to get aggressive.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Daily Stop Rules — Hard Limits</h3>
        <p className="text-sm text-muted-foreground mb-3">Most challenge failures happen in the session <em>after</em> a bad day — when the trader stays on trying to recover. The daily stop rule prevents that session from existing.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { rule: "2–2.5% daily P&L", label: "Daily loss limit", desc: "Stop trading the moment you hit this. Not after 'one more trade.' Now." },
            { rule: "2 losses", label: "Maximum per session", desc: "Two losses in a session = platform closed. Variance clusters. Step away." },
            { rule: "\"One more trade\"", label: "Banned phrase", desc: "This phrase has ended more challenges than any bad setup ever has." },
          ].map((c) => (
            <div key={c.rule} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-lg font-bold text-amber-400 mb-0.5">{c.rule}</p>
              <p className="text-xs font-semibold text-foreground/70 mb-2">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Trade Selection — A+ Setups Only</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">Qualifies ✓</p>
            {["ORB — Opening Range Breakout, clean and confirmed", "S/R — Support/resistance confluences", "Breakouts — Structure breaks with volume confirmation", "FVG — Fair Value Gaps, imbalance entries"].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3">Does Not Qualify ✗</p>
            {["Boredom trade — nothing happening so you force one", "Revenge trade — taking a trade to recover a loss", "'Almost' setup — close but not confirmed", "Impulse entry — no plan, no level, no reason"].map((t) => (
              <div key={t} className="flex items-start gap-2 mb-2">
                <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">The Math — Expected Value (EV)</h3>
        <p className="text-sm text-muted-foreground mb-4">You don't need to be right all the time. You need a positive EV and the discipline to let it compound.</p>
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">EV Formula</p>
          <p className="text-lg font-mono font-bold text-primary">(Win Rate × Avg Win) − (Loss Rate × Avg Loss)</p>
          <p className="text-sm text-muted-foreground mt-2">Example at 65% WR, 1:1 R:R on $100K (1% risk = $1,000/trade):<br/>(0.65 × $1,000) − (0.35 × $1,000) = <span className="text-emerald-400 font-bold">+$300 EV per trade</span></p>
        </div>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2.5 bg-muted/20">
            <span>Trades / Month</span><span>EV Per Trade</span><span>Monthly Growth</span>
          </div>
          {[["20 trades", "+$300", "+6%"], ["30 trades", "+$300", "+9%"], ["40 trades", "+$300", "+12%"]].map(([t, e, g], i) => (
            <div key={t} className={`grid grid-cols-3 gap-3 px-4 py-2.5 text-sm border-t border-border/30 ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
              <span className="text-muted-foreground">{t}</span>
              <span className="text-emerald-400 font-medium">{e}</span>
              <span className="text-primary font-bold">{g}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">Numbers are illustrative. Your actual EV depends on your strategy's win rate and R:R. Losing streaks of 5–7 in a row are statistically normal at 55–65% win rates.</p>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Behavior Rules — The Hidden Edge</h3>
        <div className="space-y-2">
          {[
            ["No strategy switching", "Pick a system and run it. Switching mid-challenge resets your data and compounds emotional decisions."],
            ["Never move your stop to give the trade 'more room'", "Moving stops to 'let it work' is the single fastest way to blow an account. The stop is the rule."],
            ["No averaging into losers", "Adding to a position that's against you turns a defined-risk trade into an undefined-risk emotional gamble."],
            ["Journal every trade — same day", "If you don't write it down, you didn't take it. Memory lies. The journal is the truth."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border/40 bg-card/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground mb-0.5">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>

      <InfoBox color="emerald">
        <p className="text-sm text-muted-foreground/90"><span className="text-foreground font-semibold">The goal is not to pass fast.</span> The goal is to not get disqualified. If you avoid disqualification long enough, and your strategy has positive expectancy, the math plays out. Speed is the enemy of survival.</p>
      </InfoBox>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Guides() {
  const [tab, setTab] = useState<TabId>("101");

  useEffect(() => {
    document.title = "Guides | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  const content: Record<TabId, React.ReactNode> = {
    "101": <Tab101 />,
    exchange: <TabExchange />,
    klein: <TabKlein />,
    hyro: <TabHyro />,
    compare: <TabCompare />,
    strategy: <TabStrategy />,
  };

  return (
    <PortalLayout>
      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">
            Everything you need to set up exchanges, pass prop firm challenges, and trade with a structured system.
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 flex-wrap mb-8 p-1 rounded-xl bg-muted/20 border border-border/40">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>{content[tab]}</div>

        {/* Footer disclaimer */}
        <div className="mt-12 rounded-xl border border-border/30 bg-muted/10 px-5 py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/60">Not financial advice.</span> All content in these guides represents personal opinions and experiences shared for educational and entertainment purposes only. Prop firm rules change — always verify current parameters on the firm's official dashboard before trading. Challenge fees involve real financial risk. Never pay a challenge fee with money you cannot afford to lose.
          </p>
        </div>
      </main>
    </PortalLayout>
  );
}
