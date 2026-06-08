import { useEffect } from "react";
import {
  ExternalLink,
  Users,
  CheckCircle2,
  Star,
  Clock,
  TrendingUp,
  MessageCircle,
  BarChart2,
  Zap,
} from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";

const SPOTS_TOTAL = 5;
const SPOTS_TAKEN = 3; // update this each month

const WHAT_YOU_GET = [
  {
    icon: <MessageCircle className="h-4 w-4" />,
    title: "1-on-1 Sessions",
    desc: "Private video calls focused entirely on your trading — your setups, your mistakes, your edge.",
  },
  {
    icon: <BarChart2 className="h-4 w-4" />,
    title: "Live Trade Reviews",
    desc: "Walk through your recent trades together. Find the patterns costing you money and the ones worth repeating.",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Custom Risk Framework",
    desc: "Build a position sizing and risk management system calibrated to your account size and psychology.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Signal Interpretation",
    desc: "Learn how to read and time our signals — not just copy them. Understand the structure behind each trade.",
  },
  {
    icon: <Clock className="h-4 w-4" />,
    title: "Async Support",
    desc: "Send charts and questions between sessions. Get feedback on your thinking in real time via Discord DM.",
  },
  {
    icon: <Star className="h-4 w-4" />,
    title: "Priority Discord Access",
    desc: "Direct access to flag trades for review before you enter — get a second set of eyes when it matters most.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Apply",
    desc: "Fill out a short application so we understand your experience, goals, and current challenges.",
  },
  {
    step: "02",
    title: "Discovery Call",
    desc: "A free 20-minute call to make sure mentorship is the right fit and outline what we'll work on together.",
  },
  {
    step: "03",
    title: "Start Working",
    desc: "Weekly or bi-weekly sessions, live trade reviews, and ongoing async support to accelerate your progress.",
  },
];

export default function Mentorship() {
  useEffect(() => {
    document.title = "Mentorship | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <PortalLayout>
      <main className="container max-w-4xl mx-auto px-4 md:px-6 py-8">

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/25">
              Limited Spots
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">1-on-1 Mentorship</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Most traders lose money not because of bad signals, but because of bad execution, poor risk management, and emotional decision-making. Mentorship fixes the part that signals can't — your process.
          </p>
        </div>

        {/* Spots banner */}
        {(() => {
          const remaining = SPOTS_TOTAL - SPOTS_TAKEN;
          const pct = Math.round((SPOTS_TAKEN / SPOTS_TOTAL) * 100);
          const full = remaining === 0;
          return (
            <div className={`mb-10 rounded-xl border p-5 ${full ? "border-red-500/25 bg-red-500/5" : "border-primary/25 bg-primary/5"}`}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${full ? "bg-red-500/15 border border-red-500/25 text-red-400" : "bg-primary/15 border border-primary/25 text-primary"}`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">We only take {SPOTS_TOTAL} students per month</p>
                    <p className="text-xs text-muted-foreground">Kept small intentionally — quality over quantity.</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {full ? (
                    <p className="text-sm font-bold text-red-400">Full this month</p>
                  ) : (
                    <>
                      <p className={`text-xl font-black tabular-nums ${remaining === 1 ? "text-amber-400" : "text-primary"}`}>{remaining}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">spot{remaining !== 1 ? "s" : ""} left</p>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-full bg-background/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${full ? "bg-red-500" : remaining === 1 ? "bg-amber-400" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{SPOTS_TAKEN} of {SPOTS_TOTAL} spots taken this month</span>
                  {!full && <span>{remaining} remaining</span>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* What you get */}
        <section className="mb-12">
          <h2 className="text-xl font-bold tracking-tight mb-1">What's included</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Every mentorship engagement is personalised. Here's what most members work on.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WHAT_YOU_GET.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border/50 bg-card/30 p-5 flex gap-3 items-start hover:border-primary/30 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="mb-12">
          <h2 className="text-xl font-bold tracking-tight mb-1">Who it's for</h2>
          <p className="text-sm text-muted-foreground mb-5">Mentorship works best if at least a few of these apply to you.</p>
          <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-3">
            {[
              "You've been trading for at least a few months and have real P&L history to review",
              "You follow signals but struggle with entries, position sizing, or holding through drawdowns",
              "You're profitable sometimes but inconsistent — and you know the problem is you, not the setups",
              "You want to understand the process deeply, not just copy trades",
              "You're serious about treating this like a skill, not a lottery ticket",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-xl font-bold tracking-tight mb-6">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="rounded-xl border border-border/50 bg-card/30 p-5">
                <p className="text-2xl font-black text-primary/30 mb-3 font-mono">{step}</p>
                <p className="font-bold text-sm text-foreground mb-1">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to apply?</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            The application takes about 3 minutes. We'll follow up within 48 hours to schedule your free discovery call.
          </p>
          <a
            href="MENTORSHIP_APPLY_LINK"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-7 py-3 text-sm hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(247,147,26,0.25)]">
              Apply for Mentorship
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </a>
          <p className="text-xs text-muted-foreground mt-4">
            Not sure if it's right for you? DM us on Discord first — no pressure.
          </p>
        </section>

      </main>
    </PortalLayout>
  );
}
