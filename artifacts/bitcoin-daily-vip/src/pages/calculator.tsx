import { useState, useEffect, useId } from "react";
import { PortalLayout } from "@/components/portal-layout";
import { Info } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────
const RISK_PRESETS = ["0.5", "1", "1.5", "2"];

function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUnits(n: number) {
  if (n >= 1000) return fmt(n, 0);
  if (n >= 1) return fmt(n, 2);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

// ─── shared sub-components ──────────────────────────────────────────────────
function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  hint,
  error,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={`w-full h-11 rounded-lg border border-border/60 bg-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-8" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p id={hintId} className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

function RiskInput({ risk, setRisk }: { risk: string; setRisk: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-foreground">Risk Per Trade</label>
        <div className="flex gap-1">
          {RISK_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setRisk(p)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                risk === p
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          placeholder="1"
          aria-label="Risk per trade (percent)"
          className="w-full h-11 rounded-lg border border-border/60 bg-background/60 px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">%</span>
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
  green,
  blue,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  green?: boolean;
  blue?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 text-center ${
        highlight
          ? "border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(247,147,26,0.08)]"
          : green
          ? "border-emerald-500/30 bg-emerald-500/5"
          : blue
          ? "border-blue-500/30 bg-blue-500/5"
          : "border-border/50 bg-card/30"
      }`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-primary" : green ? "text-emerald-400" : blue ? "text-blue-400" : ""}`}>{value}</p>
    </div>
  );
}

const LEVERAGE_PRESETS = ["5", "10", "20", "50", "100"];

function LeverageInput({ leverage, setLeverage }: { leverage: string; setLeverage: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-foreground">
          Leverage <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex gap-1">
          {LEVERAGE_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setLeverage(leverage === p ? "" : p)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                leverage === p
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p}×
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          min="1"
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(e.target.value)}
          placeholder="e.g. 10"
          aria-label="Leverage (optional)"
          className="w-full h-11 rounded-lg border border-border/60 bg-background/60 px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">×</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">Set your exchange leverage to see required margin.</p>
    </div>
  );
}

// ─── USDT Perp (Linear) ──────────────────────────────────────────────────────
function UsdtPerpCalc({ account, risk }: { account: string; risk: string }) {
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [tp, setTp] = useState("");
  const [leverage, setLeverage] = useState("");

  const a = parseFloat(account);
  const r = parseFloat(risk);
  const e = parseFloat(entry);
  const s = parseFloat(stop);
  const t = parseFloat(tp);
  const lev = parseFloat(leverage);

  const valid = [a, r, e, s].every((n) => !isNaN(n) && n > 0) && r <= 100 && e !== s;
  const dollarRisk = valid ? (a * r) / 100 : null;
  const distance = valid ? Math.abs(e - s) : null;
  const units = valid && dollarRisk != null && distance != null ? dollarRisk / distance : null;
  const posValue = units != null ? units * e : null;
  const leverageValid = !isNaN(lev) && lev >= 1;
  const margin = leverageValid && posValue != null ? posValue / lev : null;
  const impliedLev = posValue != null && a > 0 ? posValue / a : null;

  const isLong = e > s;
  const tpValid = valid && !isNaN(t) && t > 0 && t !== e;
  const tpDistance = tpValid ? Math.abs(t - e) : null;
  const rMultiple = tpValid && distance != null && tpDistance != null ? tpDistance / distance : null;
  const dollarGain = units != null && tpDistance != null ? units * tpDistance : null;
  const directionOk = tpValid ? (isLong ? t > e : t < e) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/30 bg-card/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">USDT Linear Perp</strong> — P&L is settled in USDT.
        Position size is in units of the base asset (BTC, ETH, SOL). Margin is paid in USDT.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <NumberInput label="Entry Price" value={entry} onChange={setEntry} placeholder="62,000" prefix="$" />
        <NumberInput
          label="Stop Loss"
          value={stop}
          onChange={setStop}
          placeholder="60,200"
          prefix="$"
          hint={valid ? `${isLong ? "Long" : "Short"} · $${fmt(Math.abs(e - s), 2)} distance` : undefined}
        />
      </div>

      <NumberInput
        label={<>Take Profit <span className="text-muted-foreground font-normal">(optional)</span></>}
        value={tp}
        onChange={setTp}
        placeholder="66,000"
        prefix="$"
        error={tpValid && directionOk === false ? `TP is on the wrong side for a ${isLong ? "long" : "short"}` : undefined}
      />

      <LeverageInput leverage={leverage} setLeverage={setLeverage} />

      {valid && dollarRisk != null && units != null && posValue != null ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <ResultCard label="USDT at Risk" value={`$${fmt(dollarRisk)}`} />
            <ResultCard label="Position Size" value={`${fmtUnits(units)} units`} highlight />
            <ResultCard label="Position Value" value={`$${posValue >= 1000 ? fmt(posValue, 0) : fmt(posValue)}`} />
          </div>
          {margin != null && (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label={`Required Margin (${lev}× lev)`} value={`$${fmt(margin)}`} blue />
              <ResultCard
                label="Implied Leverage"
                value={impliedLev != null ? `${fmt(impliedLev, 1)}×` : "—"}
                blue
              />
            </div>
          )}
          {tpValid && directionOk && rMultiple != null && dollarGain != null && (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Potential Gain" value={`+$${fmt(dollarGain)}`} green />
              <ResultCard label="Risk / Reward" value={`${fmt(rMultiple, 2)}R`} green />
            </div>
          )}
          <div className="rounded-xl border border-border/40 bg-card/20 px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Formula</p>
            <div className="space-y-1.5 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">$ Risk</span>
                <span>${fmt(a, 0)} × {r}% = <strong>${fmt(dollarRisk)}</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stop Distance</span>
                <span>|{fmt(e)} − {fmt(s)}| = <strong>${fmt(distance!, 2)}</strong></span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-1.5">
                <span className="text-muted-foreground">Units</span>
                <span>${fmt(dollarRisk)} ÷ ${fmt(distance!, 2)} = <strong className="text-primary">{fmtUnits(units)} units</strong></span>
              </div>
              {margin != null && (
                <div className="flex justify-between border-t border-border/30 pt-1.5">
                  <span className="text-muted-foreground">Margin ({lev}×)</span>
                  <span>${posValue >= 1000 ? fmt(posValue, 0) : fmt(posValue)} ÷ {lev} = <strong className="text-blue-400">${fmt(margin)}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-card/20 p-5 text-center">
          <p className="text-muted-foreground text-sm">Fill in entry and stop loss to calculate.</p>
        </div>
      )}
    </div>
  );
}

// ─── USD Perp (Inverse) ──────────────────────────────────────────────────────
const CONTRACT_PRESETS = [
  { label: "BTCUSD — $1", value: "1" },
  { label: "ETHUSD — $10", value: "10" },
  { label: "Custom", value: "" },
];

function UsdPerpCalc({ account, risk }: { account: string; risk: string }) {
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [tp, setTp] = useState("");
  const [contractSize, setContractSize] = useState("1");
  const [contractPreset, setContractPreset] = useState("1");
  const [leverage, setLeverage] = useState("");

  function selectPreset(val: string) {
    setContractPreset(val);
    if (val !== "") setContractSize(val);
  }

  const a = parseFloat(account);
  const r = parseFloat(risk);
  const e = parseFloat(entry);
  const s = parseFloat(stop);
  const t = parseFloat(tp);
  const cs = parseFloat(contractSize);

  const valid = [a, r, e, s, cs].every((n) => !isNaN(n) && n > 0) && r <= 100 && e !== s;
  const dollarRisk = valid ? (a * r) / 100 : null;
  const distance = valid ? Math.abs(e - s) : null;
  // For inverse perp: contracts = ($ risk × entry) / (|entry - stop| × contract_size)
  const contracts = valid && dollarRisk != null && distance != null
    ? Math.round((dollarRisk * e) / (distance * cs))
    : null;
  const posValueUsd = contracts != null ? contracts * cs : null;
  const baseMargin = posValueUsd != null ? posValueUsd / e : null; // BTC/ETH needed (unleveraged)
  const isLong = e > s;
  const lev = parseFloat(leverage);
  const leverageValid = !isNaN(lev) && lev >= 1;
  const marginUsd = leverageValid && posValueUsd != null ? posValueUsd / lev : null;
  const marginBase = marginUsd != null ? marginUsd / e : null; // BTC/ETH needed at chosen leverage

  const tpValid = valid && !isNaN(t) && t > 0 && t !== e;
  const tpDistance = tpValid ? Math.abs(t - e) : null;
  const tpGainPerContract = tpValid && tpDistance != null ? cs * tpDistance / e : null;
  const totalTpGain = tpGainPerContract != null && contracts != null ? tpGainPerContract * contracts : null;
  const rMultiple = tpValid && distance != null && tpDistance != null ? tpDistance / distance : null;
  const directionOk = tpValid ? (isLong ? t > e : t < e) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/30 bg-card/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">USD Inverse Perp</strong> — Contracts are denominated in USD,
        but your margin and P&L are paid in the base asset (BTC or ETH).
        Because of this, more contracts are required than on a linear perp for the same dollar risk.
      </div>

      {/* Contract size selector */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Contract Type</p>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => selectPreset(p.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                contractPreset === p.value
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {contractPreset === "" && (
          <div className="mt-3">
            <NumberInput
              label="Contract Size (USD per contract)"
              value={contractSize}
              onChange={setContractSize}
              placeholder="1"
              prefix="$"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <NumberInput label="Entry Price" value={entry} onChange={setEntry} placeholder="62,000" prefix="$" />
        <NumberInput
          label="Stop Loss"
          value={stop}
          onChange={setStop}
          placeholder="60,200"
          prefix="$"
          hint={valid ? `${isLong ? "Long" : "Short"} · $${fmt(Math.abs(e - s), 2)} distance` : undefined}
        />
      </div>

      <NumberInput
        label={<>Take Profit <span className="text-muted-foreground font-normal">(optional)</span></>}
        value={tp}
        onChange={setTp}
        placeholder="66,000"
        prefix="$"
        error={tpValid && directionOk === false ? `TP is on the wrong side for a ${isLong ? "long" : "short"}` : undefined}
      />

      <LeverageInput leverage={leverage} setLeverage={setLeverage} />

      {valid && dollarRisk != null && contracts != null && posValueUsd != null && baseMargin != null ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <ResultCard label="USD at Risk" value={`$${fmt(dollarRisk)}`} />
            <ResultCard label="Contracts" value={`${contracts.toLocaleString()}`} highlight />
            <ResultCard label="Position Value" value={`$${posValueUsd >= 1000 ? fmt(posValueUsd, 0) : fmt(posValueUsd)}`} />
          </div>
          {marginBase != null && marginUsd != null ? (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label={`Margin at ${lev}× (${cs === 1 ? "BTC" : "ETH"})`}
                value={`${fmtUnits(marginBase)} ${cs === 1 ? "BTC" : "ETH"}`}
                blue
              />
              <ResultCard
                label={`Margin at ${lev}× (USD equiv)`}
                value={`$${fmt(marginUsd)}`}
                blue
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="Base Asset Margin (1× lev)"
                value={`${fmtUnits(baseMargin)} ${cs === 1 ? "BTC" : "ETH"}`}
              />
              <ResultCard
                label="Approx BTC at Risk"
                value={`${fmtUnits(dollarRisk / e)} BTC`}
              />
            </div>
          )}
          {tpValid && directionOk && rMultiple != null && totalTpGain != null && (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Potential Gain" value={`+$${fmt(totalTpGain)}`} green />
              <ResultCard label="Risk / Reward" value={`${fmt(rMultiple, 2)}R`} green />
            </div>
          )}
          <div className="rounded-xl border border-border/40 bg-card/20 px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Formula (Inverse)</p>
            <div className="space-y-1.5 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">$ Risk</span>
                <span>${fmt(a, 0)} × {r}% = <strong>${fmt(dollarRisk)}</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loss / Contract</span>
                <span>$1 × ({fmt(e)} − {fmt(s)}) ÷ {fmt(e)} = <strong>${fmt(cs * Math.abs(e - s) / e, 4)}</strong></span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-1.5">
                <span className="text-muted-foreground">Contracts</span>
                <span>${fmt(dollarRisk)} ÷ ${fmt(cs * Math.abs(e - s) / e, 4)} = <strong className="text-primary">{contracts.toLocaleString()}</strong></span>
              </div>
              {marginUsd != null && marginBase != null && (
                <div className="flex justify-between border-t border-border/30 pt-1.5">
                  <span className="text-muted-foreground">Margin ({lev}×)</span>
                  <span>${fmt(posValueUsd >= 1000 ? posValueUsd : posValueUsd, 0)} ÷ {lev} = <strong className="text-blue-400">{fmtUnits(marginBase)} {cs === 1 ? "BTC" : "ETH"}</strong></span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="text-xs text-amber-400 leading-relaxed">
              <strong>Why more contracts?</strong> Each USD contract only loses ${fmt(cs * Math.abs(e - s) / e, 4)} when price moves from ${fmt(e)} to ${fmt(s)} — because the BTC value of each contract changes non-linearly.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-card/20 p-5 text-center">
          <p className="text-muted-foreground text-sm">Fill in entry and stop loss to calculate.</p>
        </div>
      )}
    </div>
  );
}

// ─── Sell Options ────────────────────────────────────────────────────────────
const OPT_CONTRACT_PRESETS = [
  { label: "BTC  0.01", value: "0.01", asset: "BTC" },
  { label: "ETH  0.1", value: "0.1", asset: "ETH" },
  { label: "SOL  1", value: "1", asset: "SOL" },
];

function SellOptionsCalc({ account, risk }: { account: string; risk: string }) {
  const [optType, setOptType] = useState<"put" | "call">("put");
  const [underlying, setUnderlying] = useState("");
  const [strike, setStrike] = useState("");
  const [premium, setPremium] = useState("");   // USDT per contract received
  const [closeAt, setCloseAt] = useState("");   // buyback price to cut loss (USDT per contract)
  const [contractPreset, setContractPreset] = useState("0.01");
  const [contractSize, setContractSize] = useState("0.01");

  function selectPreset(val: string) {
    setContractPreset(val);
    setContractSize(val);
  }

  const a = parseFloat(account);
  const r = parseFloat(risk);
  const u = parseFloat(underlying);
  const k = parseFloat(strike);
  const p = parseFloat(premium);
  const cl = parseFloat(closeAt);
  const cs = parseFloat(contractSize);

  const maxRisk = !isNaN(a) && !isNaN(r) && a > 0 && r > 0 ? (a * r) / 100 : null;
  // Loss per contract = (close_at price) - premium (they sell for p, must buy back at cl)
  const lossPerContract = !isNaN(p) && !isNaN(cl) && p > 0 && cl > p ? cl - p : null;
  const maxContracts = maxRisk != null && lossPerContract != null && lossPerContract > 0
    ? Math.floor(maxRisk / lossPerContract)
    : null;
  const totalPremium = maxContracts != null && !isNaN(p) ? maxContracts * p : null;
  const totalMaxLoss = maxContracts != null && lossPerContract != null ? maxContracts * lossPerContract : null;

  // Break-even for short put: strike - (premium_per_underlying / contract_size)
  // premium_per_contract in USD / (contract_size_in_underlying × underlying_price) → premium in underlying terms
  const breakEven = !isNaN(p) && !isNaN(cs) && !isNaN(u) && u > 0 && cs > 0 && !isNaN(k)
    ? optType === "put"
      ? k - p / (cs * u) * k   // approx: strike - premium_in_underlying_terms
      : k + p / (cs * u) * k
    : null;

  // Notional per contract
  const notionalPerContract = !isNaN(cs) && !isNaN(u) && cs > 0 && u > 0 ? cs * u : null;

  const selectedAsset = OPT_CONTRACT_PRESETS.find((p) => p.value === contractPreset)?.asset ?? "BTC";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/30 bg-card/20 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Selling Options (Bybit)</strong> — You collect premium upfront.
        Risk is defined by how much you'd lose if you had to buy back the option at your stop price.
        Size based on: <em>max contracts = $ risk ÷ (buyback price − premium received)</em>.
      </div>

      {/* Option type */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Option Type</p>
        <div className="flex gap-2">
          {(["put", "call"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOptType(t)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                optType === t
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              Sell {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Contract size */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">Asset / Contract Size</p>
        <div className="flex gap-2">
          {OPT_CONTRACT_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => selectPreset(p.value)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                contractPreset === p.value
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <NumberInput
          label={`${selectedAsset} Underlying Price`}
          value={underlying}
          onChange={setUnderlying}
          placeholder={contractPreset === "0.01" ? "62,000" : contractPreset === "0.1" ? "3,200" : "140"}
          prefix="$"
          hint={notionalPerContract != null ? `Notional per contract: $${fmt(notionalPerContract, 0)}` : undefined}
        />
        <NumberInput
          label={`Strike Price`}
          value={strike}
          onChange={setStrike}
          placeholder={contractPreset === "0.01" ? "60,000" : contractPreset === "0.1" ? "3,000" : "130"}
          prefix="$"
          hint={
            !isNaN(k) && !isNaN(u) && u > 0
              ? optType === "put"
                ? k < u ? `${(((u - k) / u) * 100).toFixed(1)}% OTM put` : `${(((k - u) / u) * 100).toFixed(1)}% ITM put`
                : k > u ? `${(((k - u) / u) * 100).toFixed(1)}% OTM call` : `${(((u - k) / u) * 100).toFixed(1)}% ITM call`
              : undefined
          }
        />
      </div>

      {/* Premium + close at */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <NumberInput
          label="Premium Received (USDT per contract)"
          value={premium}
          onChange={setPremium}
          placeholder="150"
          prefix="$"
        />
        <NumberInput
          label="Buy Back At (USDT per contract)"
          value={closeAt}
          onChange={setCloseAt}
          placeholder="450"
          prefix="$"
          hint={
            !isNaN(p) && !isNaN(cl) && p > 0 && cl > p
              ? `Loss per contract: $${fmt(cl - p)} · ${((cl / p - 1) * 100).toFixed(0)}% above premium`
              : lossPerContract === null && !isNaN(p) && !isNaN(cl) && cl <= p
              ? undefined
              : undefined
          }
          error={
            !isNaN(p) && !isNaN(cl) && p > 0 && cl > 0 && cl <= p
              ? "Buy-back price must be higher than premium received"
              : undefined
          }
        />
      </div>

      {maxRisk != null && maxContracts != null && totalPremium != null && totalMaxLoss != null ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <ResultCard label="Max $ Risk" value={`$${fmt(maxRisk)}`} />
            <ResultCard label="Max Contracts" value={maxContracts.toString()} highlight />
            <ResultCard label="Premium Collected" value={`$${fmt(totalPremium)}`} green />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Max Total Loss" value={`-$${fmt(totalMaxLoss)}`} />
            <ResultCard
              label="Premium-to-Risk Ratio"
              value={totalMaxLoss > 0 ? `${fmt(totalPremium / totalMaxLoss, 2)}×` : "—"}
            />
          </div>
          {breakEven != null && breakEven > 0 && (
            <div className="rounded-xl border border-border/40 bg-card/20 px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Levels</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strike</span>
                  <span className="font-medium">${fmt(k)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Break-even (approx)</span>
                  <span className="font-medium">${fmt(breakEven)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Premium / contract</span>
                  <span className="font-medium">${fmt(p)}</span>
                </div>
                <div className="flex justify-between border-t border-border/30 pt-1.5">
                  <span className="text-muted-foreground">Max loss / contract</span>
                  <span className="font-medium text-red-400">-${fmt(cl - p)}</span>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border/30 bg-card/20 px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Formula</p>
            <div className="space-y-1.5 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">$ at Risk</span>
                <span>${fmt(a, 0)} × {r}% = <strong>${fmt(maxRisk)}</strong></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loss / contract</span>
                <span>${fmt(cl)} − ${fmt(p)} = <strong>${fmt(cl - p)}</strong></span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-1.5">
                <span className="text-muted-foreground">Max Contracts</span>
                <span>floor(${fmt(maxRisk)} ÷ ${fmt(cl - p)}) = <strong className="text-primary">{maxContracts}</strong></span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 bg-card/20 p-5 text-center">
          <p className="text-muted-foreground text-sm">Fill in premium received and buy-back price to calculate.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
type Tab = "usdt-perp" | "usd-perp" | "options";

const TABS: { id: Tab; label: string; sublabel: string }[] = [
  { id: "usdt-perp", label: "USDT Perp", sublabel: "Linear" },
  { id: "usd-perp", label: "USD Perp", sublabel: "Inverse" },
  { id: "options", label: "Sell Options", sublabel: "Bybit" },
];

export default function Calculator() {
  const [tab, setTab] = useState<Tab>("usdt-perp");
  const [account, setAccount] = useState("");
  const [risk, setRisk] = useState("1");

  useEffect(() => {
    document.title = "Position Calculator | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <PortalLayout>
      <main className="container max-w-2xl mx-auto px-4 md:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Position Calculator</h1>
          <p className="text-muted-foreground mt-1">
            Bybit position sizing across USDT perps, USD perps, and options
          </p>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {TABS.map(({ id, label, sublabel }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-xl border py-3 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span className="block">{label}</span>
              <span className={`text-xs font-normal ${tab === id ? "text-primary/70" : "text-muted-foreground/60"}`}>
                {sublabel}
              </span>
            </button>
          ))}
        </div>

        {/* Account + Risk — shared across all tabs */}
        <div className="rounded-2xl border border-border/50 bg-card/30 p-6 mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NumberInput
              label="Account Size (USDT)"
              value={account}
              onChange={setAccount}
              placeholder="10,000"
              prefix="$"
            />
            <RiskInput risk={risk} setRisk={setRisk} />
          </div>
        </div>

        {/* Instrument-specific section */}
        <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {tab === "usdt-perp" ? "USDT Perpetual" : tab === "usd-perp" ? "USD Perpetual (Inverse)" : "Options (Sell)"}
          </p>
          {tab === "usdt-perp" && <UsdtPerpCalc account={account} risk={risk} />}
          {tab === "usd-perp" && <UsdPerpCalc account={account} risk={risk} />}
          {tab === "options" && <SellOptionsCalc account={account} risk={risk} />}
        </div>

        {/* Info callout */}
        <div className="mt-5 rounded-xl border border-border/30 bg-card/20 p-4 flex gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tab === "usdt-perp" && "BDV signals include entry, stop loss, and take profit. Plug those in with your account size to get the exact number of units."}
            {tab === "usd-perp" && "USD inverse perps require significantly more contracts than linear perps for the same dollar risk — the BTC-denominated P&L is non-linear."}
            {tab === "options" && "\"Buy Back At\" is the option price where you'd close the position to cap your loss. Common approach: 2–3× the premium received as your stop."}
          </p>
        </div>
      </main>
    </PortalLayout>
  );
}
