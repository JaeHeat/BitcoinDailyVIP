import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, Gift } from "lucide-react";

type ReviewState = {
  eligible: boolean;
  reason: null | "trialing" | "not_in_discord" | "too_soon";
  daysUntilEligible: number;
  existing: { status: string; rating: number } | null;
};

export function ReviewPrompt() {
  const [state, setState] = useState<ReviewState | null>(null);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/member/review`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReviewState | null) => { if (d) setState(d); })
      .catch(() => {});
  }, []);

  async function submit() {
    if (!body.trim()) { setError("Please write a few words about your experience."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/member/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, body, authorName: name, result }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const e = await res.json().catch(() => ({}));
        setError(e.error || "Something went wrong. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) return null;

  // Already submitted (this session or previously)
  if (submitted || state.existing) {
    const status = submitted ? "pending" : state.existing!.status;
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-400">
              {status === "approved" ? "Your review is live — thank you!" : "Thanks for your review!"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === "approved"
                ? "It's published on our homepage, and 25% off your next month has been applied."
                : "We're verifying it now. Once approved it'll appear on our homepage and 25% off your next month will be applied."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show nothing about reviews until the member actually qualifies — no teaser.
  if (!state.eligible) return null;

  // Eligible — show the form
  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Leave a review, get 25% off next month</CardTitle>
        </div>
        <CardDescription>You're a paying member past your first month — thank you. Share your honest experience; once approved it goes on our homepage and we'll take 25% off your next month.</CardDescription>
      </CardHeader>
      <CardContent className="pb-5 space-y-3">
        {/* Stars */}
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={rating === n}
              className="p-0.5"
            >
              <Star className={`h-6 w-6 transition-colors ${n <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/40"}`} />
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="rv-name" className="text-xs font-medium text-muted-foreground">Display name</label>
            <input
              id="rv-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex M."
              maxLength={60}
              className="mt-1 w-full h-9 rounded-md border border-border/60 bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label htmlFor="rv-result" className="text-xs font-medium text-muted-foreground">Result <span className="opacity-60">(optional)</span></label>
            <input
              id="rv-result"
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g. Up 18% in 2 months"
              maxLength={80}
              className="mt-1 w-full h-9 rounded-md border border-border/60 bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div>
          <label htmlFor="rv-body" className="text-xs font-medium text-muted-foreground">Your review</label>
          <textarea
            id="rv-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's your experience been like? Be honest — it helps other traders decide."
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button onClick={submit} disabled={submitting} className="font-semibold">
          {submitting ? "Submitting…" : "Submit review"}
        </Button>
        <p className="text-[11px] text-muted-foreground">Reviews are verified before publishing. Honest feedback only — we don't pay for fake reviews.</p>
      </CardContent>
    </Card>
  );
}
