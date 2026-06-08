import { useEffect } from "react";
import { ExternalLink, BadgeCheck, ShieldOff } from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";

interface Exchange {
  name: string;
  logo: string;
  tagline: string;
  badges: string[];
  description: string;
  cta: string;
  href: string;
  highlight?: boolean;
}

const EXCHANGES: Exchange[] = [
  {
    name: "Bybit",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bybit_logo.svg/320px-Bybit_logo.svg.png",
    tagline: "Our primary trading platform",
    badges: ["Deep liquidity", "Low fees", "Advanced order types"],
    description:
      "Bybit is the exchange most of us use day-to-day. Deep order books on BTC, ETH, and SOL, tight spreads, and a clean interface for managing leveraged positions. KYC is required — takes about 5 minutes.",
    cta: "Open Bybit Account",
    href: "https://partner.bybit.com/b/bitcoindaily",
    highlight: true,
  },
  {
    name: "BloFin",
    logo: "https://blofin.com/favicon.ico",
    tagline: "No VPN, no KYC required",
    badges: ["No KYC", "No VPN needed", "US-accessible"],
    description:
      "BloFin is the go-to for members who can't or don't want to use Bybit. No KYC, no VPN required, and it's accessible from the US. Solid liquidity on the major pairs we trade.",
    cta: "Open BloFin Account",
    href: "https://partner.blofin.com/d/BitcoinDaily",
  },
  {
    name: "Coinbase Advanced",
    logo: "https://www.coinbase.com/img/favicon/apple-touch-icon.png",
    tagline: "Leverage trading on a regulated US platform",
    badges: ["US regulated", "Leverage available", "Trusted brand"],
    description:
      "Coinbase Advanced now offers leverage trading — making it a solid option if you want a fully regulated US exchange. Familiar interface, FDIC-insured USD balances, and access to the core instruments we trade.",
    cta: "Open Coinbase Advanced",
    href: "https://www.coinbase.com/join",
  },
];

function ExchangeCard({ exchange }: { exchange: Exchange }) {
  return (
    <div
      className={`rounded-2xl border bg-card/30 p-6 flex flex-col gap-4 relative overflow-hidden transition-colors hover:border-primary/30 ${
        exchange.highlight
          ? "border-primary/40 shadow-[0_0_30px_rgba(247,147,26,0.08)]"
          : "border-border/50"
      }`}
    >
      {exchange.highlight && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={exchange.logo}
            alt={exchange.name}
            className="h-6 w-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <p className="font-bold text-base">{exchange.name}</p>
          <p className="text-xs text-muted-foreground">{exchange.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {exchange.badges.map((b) => (
          <span
            key={b}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          >
            <BadgeCheck className="h-3 w-3 shrink-0" />
            {b}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{exchange.description}</p>

      <a href={exchange.href} target="_blank" rel="noopener noreferrer" className="mt-auto">
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-primary/90 transition-colors">
          {exchange.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </a>
    </div>
  );
}

export default function Exchanges() {
  useEffect(() => {
    document.title = "Exchanges | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <PortalLayout>
      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Exchanges</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">
            Where to trade. All three support the instruments we cover — pick whichever fits your jurisdiction and KYC preference.
          </p>
        </div>

        <div className="mb-10 rounded-xl border border-border/40 bg-muted/20 px-5 py-4 flex gap-3 items-start">
          <ShieldOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclosure:</span> These are affiliate links — we earn a small commission if you sign up. We only recommend platforms we personally use. This is not financial advice; always do your own due diligence before depositing funds on any exchange.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {EXCHANGES.map((e) => (
            <ExchangeCard key={e.name} exchange={e} />
          ))}
        </div>
      </main>
    </PortalLayout>
  );
}
