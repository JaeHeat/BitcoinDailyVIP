import { useState, useEffect, useCallback } from "react";
import { Star, Check, X } from "lucide-react";

type AdminReview = {
  id: number;
  authorName: string;
  rating: number;
  result: string | null;
  body: string;
  status: string;
  email: string | null;
};

export function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const refresh = useCallback(() => {
    fetch(`${import.meta.env.BASE_URL}api/admin/reviews`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews: AdminReview[] } | null) => { if (d?.reviews) setReviews(d.reviews); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function moderate(id: number, action: "approve" | "reject") {
    setBusy(id);
    try {
      await fetch(`${import.meta.env.BASE_URL}api/admin/reviews/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r)));
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  const pending = reviews.filter((r) => r.status === "pending");
  const others = reviews.filter((r) => r.status !== "pending");

  const badge = (status: string) =>
    status === "approved"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : status === "rejected"
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-amber-400 bg-amber-500/10 border-amber-500/30";

  const Row = ({ r }: { r: AdminReview }) => (
    <div className="rounded-xl border border-border/40 bg-card/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{r.authorName}</span>
            <span className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
              ))}
            </span>
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${badge(r.status)}`}>{r.status}</span>
          </div>
          {r.result && <p className="text-xs text-primary mt-0.5">{r.result}</p>}
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">"{r.body}"</p>
          {r.email && <p className="text-[11px] text-muted-foreground/60 mt-1">{r.email}</p>}
        </div>
        {r.status === "pending" && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => moderate(r.id, "approve")}
              disabled={busy === r.id}
              aria-label="Approve review"
              className="h-8 w-8 rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center justify-center disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => moderate(r.id, "reject")}
              disabled={busy === r.id}
              aria-label="Reject review"
              className="h-8 w-8 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center justify-center disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-border/50 bg-card/20 p-5">
      <h2 className="text-lg font-bold tracking-tight mb-1">Member reviews</h2>
      <p className="text-sm text-muted-foreground mb-4">Approve a review to publish it on the homepage. Approved members get 25% off their next month applied.</p>
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No reviews submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pending ({pending.length})</p>
              {pending.map((r) => <Row key={r.id} r={r} />)}
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reviewed</p>
              {others.map((r) => <Row key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
