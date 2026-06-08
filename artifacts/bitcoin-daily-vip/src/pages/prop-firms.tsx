import { useEffect } from "react";
import { ExternalLink, Zap, ShieldOff, Users } from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";

interface PropFirm {
  name: string;
  logo: string;
  tagline: string;
  badges: string[];
  description: string;
  cta: string;
  href: string;
  code?: string;
}

const PROP_FIRMS: PropFirm[] = [
  {
    name: "Klein Funding",
    logo: "https://kleinfunding.com/favicon.ico",
    tagline: "Trade their capital, keep the profits",
    badges: ["Fast payouts", "No time limits", "BTC & crypto pairs"],
    description:
      "Klein Funding is a crypto prop firm that lets you trade a funded account using our exact strategies. Pass the challenge using our signals and risk parameters, then trade a live funded account and keep up to 90% of profits.",
    cta: "Get Funded with Klein",
    href: "https://kleinfunding.com",
    code: "btcdaily",
  },
  {
    name: "Hyrotrader",
    logo: "https://hyrotrader.com/favicon.ico",
    tagline: "Funded crypto trading with flexible rules",
    badges: ["Flexible evaluation", "Crypto native", "Fast scaling"],
    description:
      "Hyrotrader is another prop firm we recommend to members who want to scale without risking their own capital. Flexible evaluation rules and crypto-native infrastructure — pairs well with our trade signals and risk system.",
    cta: "Get Funded with Hyro",
    href: "https://www.hyrotrader.com/?coupon=btcdaily",
    code: "btcdaily",
  },
];

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
          <span
            key={b}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
          >
            <Zap className="h-3 w-3 shrink-0" />
            {b}
          </span>
        ))}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{firm.description}</p>

      {firm.code && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/8 border border-primary/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">Discount code:</span>
          <span className="text-sm font-bold text-primary tracking-widest">{firm.code}</span>
          <span className="text-xs text-muted-foreground ml-auto">10% off</span>
        </div>
      )}

      <a href={firm.href} target="_blank" rel="noopener noreferrer" className="mt-auto">
        <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/50 font-semibold text-sm px-4 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
          {firm.cta}
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </a>
    </div>
  );
}

export default function PropFirms() {
  useEffect(() => {
    document.title = "Prop Firms | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <PortalLayout>
      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Prop Firms</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Funded Trading
            </span>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Trade with their capital, keep the profits. Pass the evaluation challenge using our signals and risk parameters — then scale without putting your own money on the line.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-border/40 bg-muted/20 px-5 py-4 flex gap-3 items-start">
          <ShieldOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Disclosure:</span> These are affiliate links — we earn a small commission if you sign up. We only recommend firms we've vetted. This is not financial advice; always read each firm's rules carefully before signing up.
          </p>
        </div>

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
      </main>
    </PortalLayout>
  );
}
