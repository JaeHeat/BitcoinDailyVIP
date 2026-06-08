import { useEffect } from "react";
import { ExternalLink, BadgeCheck, Zap, ShieldOff, Users } from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";

interface Partner {
  name: string;
  logo: string;
  tagline: string;
  badges: string[];
  description: string;
  cta: string;
  href: string;
  highlight?: boolean;
}

interface PropFirm {
  name: string;
  logo: string;
  tagline: string;
  badges: string[];
  description: string;
  cta: string;
  href: string;
}

const EXCHANGES: Partner[] = [
  {
    name: "Bybit",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bybit_logo.svg/320px-Bybit_logo.svg.png",
    tagline: "Our primary trading platform",
    badges: ["Deep liquidity", "Low fees", "Advanced order types"],
    description:
      "Bybit is the exchange most of us use day-to-day. Deep order books on BTC, ETH, and SOL, tight spreads, and a clean interface for managing leveraged positions. KYC is required — takes about 5 minutes.",
    cta: "Open Bybit Account",
    href: "BYBIT_REF_LINK",
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
    href: "BLOFIN_REF_LINK",
  },
  {
    name: "Coinbase Advanced",
    logo: "https://www.coinbase.com/img/favicon/apple-touch-icon.png",
    tagline: "Leverage trading on a regulated US platform",
    badges: ["US regulated", "Leverage available", "Trusted brand"],
    description:
      "Coinbase Advanced now offers leverage trading — making it a solid option if you want a fully regulated US exchange. Familiar interface, FDIC-insured USD balances, and access to the core instruments we trade.",
    cta: "Open Coinbase Advanced",
    href: "COINBASE_REF_LINK",
  },
];

const PROP_FIRMS: PropFirm[] = [
  {
    name: "Klein Funding",
    logo: "https://kleinfunding.com/favicon.ico",
    tagline: "Trade their capital, keep the profits",
    badges: ["Fast payouts", "No time limits", "BTC & crypto pairs"],
    description:
      "Klein Funding is a crypto prop firm that lets you trade a funded account using our exact strategies. Pass the challenge using our signals and risk parameters, then trade a live funded account and keep up to 90% of profits.",
    cta: "Get Funded with Klein",
    href: "KLEIN_REF_LINK",
  },
  {
    name: "Hyrotrader",
    logo: "https://hyrotrader.com/favicon.ico",
    tagline: "Funded crypto trading with flexible rules",
    badges: ["Flexible evaluation", "Crypto native", "Fast scaling"],
    description:
      "Hyrotrader is another prop firm we recommend to members who want to scale without risking their own capital. Flexible evaluation rules and crypto-native infrastructure — pairs well with our trade signals and risk system.",
    cta: "Get Funded with Hyro",
    href: "HYRO_REF_LINK",
  },
];

function ExchangeCard({ partner }: { partner: Partner }) {
  return (
    <div className={`rounded-2xl border bg-card/30 p-6 flex flex-col gap-4 relative overflow-hidden transition-colors hover:border-primary/30 ${partner.highlight ? "border-primary/40 shadow-[0_0_30px_rgba(247,147,26,0.08)]" : "border-border/50"}`}>
      {partner.highlight && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
          Recommended
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={partner.logo}
            alt={partner.name}
            className="h-6 w-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <p className="font-bold text-base">{partner.name}</p>
          <p className="text-xs text-muted-foreground">{partner.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {partner.badges.map((b) => (
          <span key={b} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BadgeCheck className="h-3 w-3 shrink-0" />
            {b}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{partner.description}</p>

      <a
        href={partner.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto"
      >
        <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-primary/90 transition-colors">
          {partner.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </a>
    </div>
  );
}

function PropFirmCard({ firm }: { firm: PropFirm }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/30 p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 overflow-hidden">
          <img
            src={firm.logo}
            alt={firm.name}
            className="h-6 w-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div>
          <p className="font-bold text-base">{firm.name}</p>
          <p className="text-xs text-muted-foreground">{firm.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {firm.badges.map((b) => (
          <span key={b} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Zap className="h-3 w-3 shrink-0" />
            {b}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{firm.description}</p>

      <a
        href={firm.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto"
      >
        <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/50 font-semibold text-sm px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
          {firm.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </a>
    </div>
  );
}

export default function Partners() {
  useEffect(() => {
    document.title = "Partners & Exchanges | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <PortalLayout>
      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Partners & Exchanges</h1>
          <p className="text-muted-foreground mt-1.5 max-w-2xl">
            The platforms we actually use and recommend — vetted for liquidity, fees, and reliability. Signing up through our referral links supports the community at no extra cost to you.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-10 rounded-xl border border-border/40 bg-muted/20 px-5 py-4 flex gap-3 items-start">
          <ShieldOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclosure:</span> These are affiliate links — we earn a small commission if you sign up. We only recommend platforms we personally use. This is not financial advice; always do your own due diligence before depositing funds on any exchange or prop firm.
          </p>
        </div>

        {/* Exchanges */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold tracking-tight">Exchanges</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Where to trade. All three support the instruments we cover — pick whichever fits your jurisdiction and KYC preference.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EXCHANGES.map((p) => (
              <ExchangeCard key={p.name} partner={p} />
            ))}
          </div>
        </section>

        {/* Prop Firms */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold tracking-tight">Prop Firms</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Funded Trading
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Trade with their capital, keep the profits. Pass the evaluation challenge using our signals and risk parameters — then scale without putting your own money on the line.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PROP_FIRMS.map((f) => (
              <PropFirmCard key={f.name} firm={f} />
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 flex gap-3 items-start">
            <Users className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">How members use prop firms:</span> Use our live signals and risk parameters to trade the evaluation challenge. Our position sizing framework is specifically built around the risk rules most prop firms use — making it a natural fit.
            </p>
          </div>
        </section>

      </main>
    </PortalLayout>
  );
}
