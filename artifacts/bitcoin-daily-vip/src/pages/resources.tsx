import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BookOpen, Shield, BarChart2, MessageCircle } from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";
import { ContentRenderer } from "@/components/ContentRenderer";
import { SignalCard } from "@/components/signal-card";
import type { ResourceCategory } from "@/lib/content-types";

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Entry", def: "The price at which you open the trade." },
  { term: "Stop-loss (SL)", def: "A pre-set exit that caps your loss if the trade goes against you. Always use one." },
  { term: "Take-profit (TP)", def: "A target price where you close some or all of the position to lock in gains." },
  { term: "Long", def: "A bet that price goes UP. You profit as it rises." },
  { term: "Short", def: "A bet that price goes DOWN. You profit as it falls." },
  { term: "Limit order", def: "An order to buy/sell at a specific price or better — it only fills at your price." },
  { term: "Market order", def: "An order that fills immediately at the current price." },
  { term: "Risk per trade", def: "The % of your account you'd lose if the stop is hit. We use ~1%." },
  { term: "R / R-multiple", def: "Reward measured in units of risk. A 1:3 trade risks 1R to make 3R." },
  { term: "Leverage", def: "Borrowed size that amplifies both gains and losses. More leverage = more risk." },
  { term: "Liquidation", def: "When leverage losses wipe your margin and the exchange force-closes the position. Stops prevent this." },
  { term: "Position size", def: "How many units/contracts to trade so that hitting your stop equals your risk %. Use the calculator." },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BarChart2: <BarChart2 className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  MessageCircle: <MessageCircle className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
};

function GuideCard({ guide }: { guide: ResourceCategory["guides"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-card/50 transition-colors"
      >
        <div>
          <p className="font-medium text-sm">{guide.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{guide.readTime} read</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border/30 pt-4">
          <ContentRenderer blocks={guide.blocks} />
        </div>
      )}
    </div>
  );
}

export default function Resources() {
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Member Resources | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  useEffect(() => {
    fetch("/api/member/resources")
      .then((r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return null; }
        return r.ok ? r.json() : Promise.reject(r.status);
      })
      .then((data: ResourceCategory[] | null) => {
        if (!data) return;
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (forbidden) setLocation(`${basePath}/portal`);
  }, [forbidden, basePath, setLocation]);

  const visible = search.trim()
    ? categories
        .map((c) => ({
          ...c,
          guides: c.guides.filter((g) =>
            g.title.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((c) => c.guides.length > 0)
    : activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  if (forbidden) return null;

  return (
    <PortalLayout>
      <main className="container max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Member Resources</h1>
          <p className="text-muted-foreground mt-1">
            Guides, frameworks, and playbooks to help you trade with edge
          </p>
        </div>

        {/* Start here — how to read a signal */}
        <section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Start here</p>
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-2">How to read a signal</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Every signal gives you four numbers. Open at the <span className="text-foreground font-medium">entry</span>, protect
                yourself with the <span className="text-red-400 font-medium">stop-loss</span>, and bank profit at
                the <span className="text-emerald-400 font-medium">take-profits</span>. Size the trade so that hitting your stop
                only costs your set risk (usually 1%).
              </p>
              <Button size="sm" variant="outline" onClick={() => setLocation(`${basePath}/calculator`)}>
                Size it with the Position Calculator →
              </Button>
            </div>
            <SignalCard annotated />
          </div>
        </section>

        {/* Glossary */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Plain-English glossary</h2>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="rounded-lg border border-border/40 bg-card/30 px-4 py-3">
                <p className="text-sm font-semibold">{g.term}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search guides…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
            className="w-full h-10 rounded-lg border border-border/60 bg-background/60 px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {!search && (
          <div className="flex gap-2 flex-wrap mb-6">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.id)}
                className="gap-1.5"
              >
                {CATEGORY_ICONS[cat.icon]}
                {cat.label}
              </Button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        ) : (
          <div className="space-y-8">
            {visible.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  {CATEGORY_ICONS[cat.icon]}
                  <h2 className="text-sm font-semibold uppercase tracking-wider">
                    {cat.label}
                  </h2>
                </div>
                <div className="space-y-3">
                  {cat.guides.map((guide) => (
                    <GuideCard key={guide.title} guide={guide} />
                  ))}
                </div>
              </section>
            ))}
            {visible.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-12">
                No guides match your search.
              </p>
            )}
          </div>
        )}
      </main>
    </PortalLayout>
  );
}
