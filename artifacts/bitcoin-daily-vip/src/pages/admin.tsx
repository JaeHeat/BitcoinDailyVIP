import { useState, useEffect } from "react";
import { useUser } from "@/lib/clerk-compat";
import { useLocation } from "wouter";
import { AdminReviews } from "@/components/admin-reviews";
import {
  useGetAdminStats,
  useGetAdminSubscribers,
  useGetChurnChart,
  useGetAdminWinbackStats,
  useGetSurveyResults,
  useGrantTrial,
  useListCoupons,
  useCreateCoupon,
  ApiError,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Tab = "overview" | "subscribers" | "winback" | "survey" | "trials" | "coupons" | "reviews";

function ReviewsPanel() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [submissions, setSubmissions] = useState<
    Array<{ id: number; email: string; reviewSubmissionUrl: string; subscriptionId: string | null; createdAt: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState<number | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${basePath}/api/admin/review-submissions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as { submissions: typeof submissions };
      setSubmissions(data.submissions);
    } catch {
      setError("Failed to load review submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function approve(userId: number) {
    setApproving(userId);
    try {
      const res = await fetch(`${basePath}/api/admin/review-approve/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Failed to approve");
      }
      setApprovedIds((prev) => new Set([...prev, userId]));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error approving");
    } finally {
      setApproving(null);
    }
  }

  const pending = submissions.filter((s) => !approvedIds.has(s.id));

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Review Submissions</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${pending.length} pending approval`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-destructive text-sm py-10">{error}</p>
        ) : pending.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">No pending review submissions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left pb-2 pr-4 font-medium">Member</th>
                  <th className="text-left pb-2 pr-4 font-medium">Review Link</th>
                  <th className="text-left pb-2 pr-4 font-medium">Submitted</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((s) => (
                  <tr key={s.id} className="border-b border-border/30 last:border-0">
                    <td className="py-3 pr-4 font-medium">{s.email}</td>
                    <td className="py-3 pr-4 max-w-xs">
                      {(() => {
                        let safeHref: string | null = null;
                        try {
                          const p = new URL(s.reviewSubmissionUrl);
                          if (p.protocol === "https:") safeHref = s.reviewSubmissionUrl;
                        } catch { /* invalid URL */ }
                        return safeHref ? (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:opacity-80 truncate block"
                            title={safeHref}
                          >
                            {safeHref.replace(/^https:\/\//, "")}
                          </a>
                        ) : (
                          <span className="text-destructive text-sm">[invalid URL]</span>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        disabled={approving === s.id || !s.subscriptionId}
                        title={!s.subscriptionId ? "Member has no active subscription" : undefined}
                        onClick={() => approve(s.id)}
                      >
                        {approving === s.id ? "Approving…" : "Approve & Apply 25%"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrialsPanel() {
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const grantMutation = useGrantTrial({
    mutation: {
      onSuccess: (data) => {
        setResult({ ok: true, message: data.message });
        setEmail("");
        setDays(7);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Failed to grant trial";
        setResult({ ok: false, message: msg });
      },
    },
  });

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Grant Free Trial</CardTitle>
        <CardDescription>
          Manually grant a free trial to any signed-up user by email. The trial gives them full member access without a Stripe subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              User email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setResult(null); }}
              placeholder="user@example.com"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Days
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-24 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                days === d
                  ? "bg-primary/20 border-primary/60 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        <Button
          onClick={() => grantMutation.mutate({ data: { email, days } })}
          disabled={!email.trim() || days < 1 || grantMutation.isPending}
          className="w-full sm:w-auto"
        >
          {grantMutation.isPending ? "Granting…" : `Grant ${days}-Day Trial`}
        </Button>

        {result && (
          <div className={`rounded-lg border p-3 text-sm ${
            result.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}>
            {result.message}
          </div>
        )}

        <div className="rounded-lg border border-border/40 bg-card/30 p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm">How it works</p>
          <p>The user must have already signed up. Their account will show as <span className="text-blue-400">Trialing</span> in the subscriber list, and they'll have full member access through the portal for the duration of the trial.</p>
          <p>After the trial expires, they'll be prompted to subscribe to continue access. No Stripe action is taken — this is a pure DB-level grant.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CouponsPanel() {
  const [form, setForm] = useState({
    name: "",
    discountType: "percent" as "percent" | "amount",
    percentOff: "",
    amountOff: "",
    currency: "usd",
    duration: "once" as "once" | "repeating" | "forever",
    durationInMonths: "",
    maxRedemptions: "",
    code: "",
  });
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const couponsQ = useListCoupons({ query: { queryKey: ["coupons"] } });

  const createMutation = useCreateCoupon({
    mutation: {
      onSuccess: (data) => {
        setResult({
          ok: true,
          message: `Coupon "${data.name ?? data.id}" created${data.promoCode ? ` with promo code: ${data.promoCode}` : ""}.`,
        });
        setForm({ name: "", discountType: "percent", percentOff: "", amountOff: "", currency: "usd", duration: "once", durationInMonths: "", maxRedemptions: "", code: "" });
        couponsQ.refetch();
      },
      onError: (err) => setResult({ ok: false, message: err instanceof Error ? err.message : "Failed to create coupon" }),
    },
  });

  const handleCreate = () => {
    const payload: Parameters<typeof createMutation.mutate>[0]["data"] = {
      name: form.name,
      duration: form.duration,
    };
    if (form.discountType === "percent" && form.percentOff) payload.percentOff = parseFloat(form.percentOff);
    if (form.discountType === "amount" && form.amountOff) {
      payload.amountOff = Math.round(parseFloat(form.amountOff) * 100);
      payload.currency = form.currency;
    }
    if (form.duration === "repeating" && form.durationInMonths) payload.durationInMonths = parseInt(form.durationInMonths);
    if (form.maxRedemptions) payload.maxRedemptions = parseInt(form.maxRedemptions);
    if (form.code) payload.code = form.code;
    createMutation.mutate({ data: payload });
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Create Coupon</CardTitle>
          <CardDescription>
            Coupons are created in Stripe. If you add a promo code, customers can enter it at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coupon name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. 20% Off First Month"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Promo code (optional)</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME20"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discount type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percent" | "amount" }))}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="percent">% Off</option>
                <option value="amount">$ Amount Off</option>
              </select>
            </div>
            {form.discountType === "percent" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Percent off</label>
                <input
                  type="number" min={1} max={100} step={1}
                  value={form.percentOff}
                  onChange={(e) => setForm((f) => ({ ...f, percentOff: e.target.value }))}
                  placeholder="20"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount off ($)</label>
                <input
                  type="number" min={0.01} step={0.01}
                  value={form.amountOff}
                  onChange={(e) => setForm((f) => ({ ...f, amountOff: e.target.value }))}
                  placeholder="20.00"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</label>
              <select
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value as "once" | "repeating" | "forever" }))}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="once">Once (first payment)</option>
                <option value="repeating">Repeating (N months)</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.duration === "repeating" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration in months</label>
                <input
                  type="number" min={1}
                  value={form.durationInMonths}
                  onChange={(e) => setForm((f) => ({ ...f, durationInMonths: e.target.value }))}
                  placeholder="3"
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max redemptions (optional)</label>
              <input
                type="number" min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                placeholder="Unlimited"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!form.name || (!form.percentOff && !form.amountOff) || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Coupon"}
          </Button>

          {result && (
            <div className={`rounded-lg border p-3 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              {result.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing coupons */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Coupons</CardTitle>
          <CardDescription>
            {couponsQ.isLoading ? "Loading…" : `${couponsQ.data?.coupons.filter((c) => c.valid).length ?? 0} active`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {couponsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : couponsQ.data?.coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No coupons yet</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-left">
                    <th className="pb-3 px-2 font-medium">Name</th>
                    <th className="pb-3 px-2 font-medium">Discount</th>
                    <th className="pb-3 px-2 font-medium">Duration</th>
                    <th className="pb-3 px-2 font-medium">Promo Code</th>
                    <th className="pb-3 px-2 font-medium text-right">Redeemed</th>
                    <th className="pb-3 px-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {couponsQ.data?.coupons.map((c) => (
                    <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <td className="py-3 px-2">
                        <p className="font-medium">{c.name ?? c.id}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.id}</p>
                      </td>
                      <td className="py-3 px-2 font-medium">
                        {c.percentOff != null
                          ? `${c.percentOff}% off`
                          : c.amountOff != null
                          ? `$${(c.amountOff / 100).toFixed(2)} off`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground capitalize">
                        {c.duration}{c.durationInMonths ? ` (${c.durationInMonths}mo)` : ""}
                      </td>
                      <td className="py-3 px-2">
                        {c.promoCode ? (
                          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">{c.promoCode}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {c.timesRedeemed}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`text-xs font-medium ${c.valid ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {c.valid ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400",
  trialing: "text-blue-400",
  paused: "text-amber-400",
  past_due: "text-red-400",
  canceled: "text-red-400",
  none: "text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  paused: "Paused",
  past_due: "Past Due",
  canceled: "Cancelled",
  none: "None",
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accent ?? ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChurnChart({
  data,
}: {
  data: Array<{ date: string; newSubscribers: number; churned: number }>;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    item: (typeof data)[0];
  } | null>(null);

  if (data.length < 2) {
    return (
      <p className="text-center text-muted-foreground py-10 text-sm">
        Not enough data yet
      </p>
    );
  }

  const W = 700;
  const H = 200;
  const PAD = { top: 12, right: 16, bottom: 32, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const maxY = Math.max(
    1,
    ...data.flatMap((d) => [d.newSubscribers, d.churned]),
  );

  const px = (i: number) =>
    PAD.left + (i / Math.max(1, data.length - 1)) * cW;
  const py = (v: number) => PAD.top + cH - (v / maxY) * cH;

  const linePath = (key: "newSubscribers" | "churned") =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d[key]).toFixed(1)}`,
      )
      .join(" ");

  const fillPath = (key: "newSubscribers" | "churned") =>
    `${linePath(key)} L ${px(data.length - 1).toFixed(1)} ${(PAD.top + cH).toFixed(1)} L ${PAD.left} ${(PAD.top + cH).toFixed(1)} Z`;

  // Dedupe so low/flat data (maxY 0 or 1) doesn't produce repeated tick
  // values — which both warned on duplicate keys and overlapped axis labels.
  const yTicks = [...new Set([0, Math.ceil(maxY / 2), maxY])];
  const xTickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="newGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((v, ti) => (
          <g key={ti}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={py(v)}
              y2={py(v)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={py(v) + 4}
              textAnchor="end"
              fontSize="9"
              fill="rgba(150,155,165,0.7)"
            >
              {v}
            </text>
          </g>
        ))}

        {data
          .filter((_, i) => i % xTickEvery === 0 || i === data.length - 1)
          .map((d) => {
            const i = data.indexOf(d);
            return (
              <text
                key={d.date}
                x={px(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize="9"
                fill="rgba(150,155,165,0.7)"
              >
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </text>
            );
          })}

        <path d={fillPath("newSubscribers")} fill="url(#newGrad)" />
        <path
          d={linePath("newSubscribers")}
          stroke="#34d399"
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path d={fillPath("churned")} fill="url(#churnGrad)" />
        <path
          d={linePath("churned")}
          stroke="#f87171"
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => {
          const x = px(i);
          const prevX = i === 0 ? PAD.left : (px(i - 1) + x) / 2;
          const nextX =
            i === data.length - 1 ? W - PAD.right : (x + px(i + 1)) / 2;
          return (
            <rect
              key={i}
              x={prevX}
              y={PAD.top}
              width={nextX - prevX}
              height={cH}
              fill="transparent"
              onMouseEnter={() => setTooltip({ x, item: d })}
            />
          );
        })}

        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + cH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <circle
              cx={tooltip.x}
              cy={py(tooltip.item.newSubscribers)}
              r="3.5"
              fill="#34d399"
            />
            <circle
              cx={tooltip.x}
              cy={py(tooltip.item.churned)}
              r="3.5"
              fill="#f87171"
            />
          </>
        )}
      </svg>

      {tooltip && (
        <div className="absolute top-2 right-2 bg-card border border-border/60 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none z-10">
          <p className="font-semibold text-foreground mb-1">
            {new Date(tooltip.item.date + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" },
            )}
          </p>
          <p className="text-emerald-400">
            +{tooltip.item.newSubscribers} joined
          </p>
          <p className="text-red-400">−{tooltip.item.churned} churned</p>
        </div>
      )}
    </div>
  );
}

const PIE_COLORS = [
  "#f7931a",
  "#34d399",
  "#60a5fa",
  "#f87171",
  "#a78bfa",
  "#fbbf24",
  "#fb923c",
];

function SurveyPieChart({
  reasons,
}: {
  reasons: Array<{ reason: string; count: number; percentage: number }>;
}) {
  const total = reasons.reduce((s, r) => s + r.count, 0);
  if (total === 0) return null;

  const CX = 90;
  const CY = 90;
  const R = 70;
  const INNER_R = 42;

  let angle = -Math.PI / 2;
  const slices = reasons.map((item, i) => {
    const sweep = (item.count / total) * 2 * Math.PI;
    const end = angle + sweep;
    const x1 = CX + R * Math.cos(angle);
    const y1 = CY + R * Math.sin(angle);
    const x2 = CX + R * Math.cos(end);
    const y2 = CY + R * Math.sin(end);
    const ix1 = CX + INNER_R * Math.cos(end);
    const iy1 = CY + INNER_R * Math.sin(end);
    const ix2 = CX + INNER_R * Math.cos(angle);
    const iy2 = CY + INNER_R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const path = [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
      `A ${INNER_R} ${INNER_R} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
      "Z",
    ].join(" ");
    const result = { ...item, path, color: PIE_COLORS[i % PIE_COLORS.length] };
    angle = end;
    return result;
  });

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <svg
        viewBox="0 0 180 180"
        className="w-44 h-44 flex-shrink-0"
        aria-hidden="true"
      >
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            stroke="hsl(220,20%,10%)"
            strokeWidth="1.5"
          />
        ))}
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="hsl(0,0%,95%)"
        >
          {total}
        </text>
        <text
          x={CX}
          y={CY + 10}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(150,155,165,0.8)"
        >
          responses
        </text>
      </svg>
      <div className="space-y-2 flex-1 min-w-[180px]">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-foreground truncate flex-1">{s.reason}</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {s.count} ({s.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [tab, setTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const statsQ = useGetAdminStats({
    query: { queryKey: ["adminStats"], retry: false },
  });
  const churnQ = useGetChurnChart(
    { days },
    { query: { queryKey: ["churnChart", days], retry: false } },
  );
  const subscribersQ = useGetAdminSubscribers(
    { page, limit: 50, status: statusFilter, search: search || undefined },
    {
      query: {
        queryKey: ["adminSubscribers", page, statusFilter, search],
        retry: false,
      },
    },
  );
  const winbackQ = useGetAdminWinbackStats({
    query: { queryKey: ["adminWinbackStats"], retry: false },
  });
  const surveyQ = useGetSurveyResults({
    query: { queryKey: ["surveyResults"], retry: false },
  });

  const isForbidden =
    (statsQ.isError &&
      statsQ.error instanceof ApiError &&
      (statsQ.error.status === 403 || statsQ.error.status === 401)) ||
    (subscribersQ.isError &&
      subscribersQ.error instanceof ApiError &&
      (subscribersQ.error.status === 403 ||
        subscribersQ.error.status === 401));

  // Redirect non-admin users away rather than rendering the dashboard shell
  useEffect(() => {
    if (isForbidden) {
      setLocation(`${basePath}/portal`);
    }
  }, [isForbidden]);

  const stats = statsQ.data;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "subscribers", label: "Subscribers" },
    { id: "winback", label: "Win-back" },
    { id: "survey", label: "Survey" },
    { id: "trials", label: "Trials" },
    { id: "coupons", label: "Coupons" },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              onClick={() => setLocation(`${basePath}/portal`)}
            >
              ← Portal
            </button>
            <span className="text-border">|</span>
            <span className="font-bold tracking-tight">
              Bitcoin Daily VIP — Admin
            </span>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {isForbidden ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-12 text-center space-y-2">
              <p className="text-lg font-semibold text-destructive">
                Access Denied
              </p>
              <p className="text-sm text-muted-foreground">
                Set{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  ADMIN_CLERK_USER_ID
                </code>{" "}
                to your Clerk user ID to unlock this dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Revenue row */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue — This Month</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Gross Volume"
                  value={stats ? `$${stats.grossVolume.toLocaleString()}` : "—"}
                  sub="total payments collected"
                  accent="text-primary"
                />
                <StatCard
                  label="Net Volume"
                  value={stats ? `$${stats.netVolume.toLocaleString()}` : "—"}
                  sub="after refunds"
                  accent="text-primary"
                />
                <StatCard
                  label="MRR"
                  value={stats ? `$${stats.mrr.toLocaleString()}` : "—"}
                  sub="monthly recurring"
                  accent="text-primary"
                />
              </div>
            </div>

            {/* Subscribers row */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Subscribers</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Active Subs"
                  value={stats?.activeSubscribers ?? "—"}
                  sub="paying members"
                  accent="text-emerald-400"
                />
                <StatCard
                  label="New Subscribers"
                  value={stats ? `+${stats.newSubscribersThisMonth}` : "—"}
                  sub="this month"
                  accent="text-emerald-400"
                />
                <StatCard
                  label="New Users"
                  value={stats ? `+${stats.newUsersThisMonth}` : "—"}
                  sub="signed up this month"
                />
                <StatCard
                  label="Total Members"
                  value={stats?.totalSubscribers ?? "—"}
                  sub="all time"
                />
              </div>
            </div>

            {/* Trials & churn row */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trials &amp; Churn — This Month</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard
                  label="New Trials"
                  value={stats?.newTrialsThisMonth ?? "—"}
                  sub="trial starts this month"
                  accent="text-blue-400"
                />
                <StatCard
                  label="Trial Conv. Rate"
                  value={stats != null ? `${stats.trialConversionRate}%` : "—"}
                  sub="trials → paid"
                  accent="text-emerald-400"
                />
                <StatCard
                  label="Sub Churn Rate"
                  value={stats != null ? `${stats.churnRate}%` : "—"}
                  sub="cancelled this month"
                  accent={
                    (stats?.churnRate ?? 0) > 5
                      ? "text-red-400"
                      : (stats?.churnRate ?? 0) > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                />
                <StatCard
                  label="Churned"
                  value={stats?.churnedThisMonth ?? "—"}
                  sub="cancellations this month"
                  accent={
                    (stats?.churnedThisMonth ?? 0) > 0
                      ? "text-red-400"
                      : "text-muted-foreground"
                  }
                />
              </div>
            </div>

            {/* Health row */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Health</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Paused"
                  value={stats?.pausedSubscribers ?? "—"}
                  sub="subscriptions paused"
                />
                <StatCard
                  label="Discord Failures"
                  value={stats?.discordSyncFailures ?? "—"}
                  sub="last 24 h"
                  accent={
                    (stats?.discordSyncFailures ?? 0) > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border/40">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    tab === t.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {tab === "overview" && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        Subscriber Activity
                      </CardTitle>
                      <CardDescription>
                        New joins vs cancellations per day
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {[30, 60, 90].map((d) => (
                        <button
                          key={d}
                          onClick={() => setDays(d)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            days === d
                              ? "bg-primary/20 border-primary/60 text-primary"
                              : "border-border/50 text-muted-foreground hover:border-border"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {churnQ.isLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : churnQ.data ? (
                    <>
                      <ChurnChart data={churnQ.data.data} />
                      <div className="flex gap-4 mt-3 justify-end">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-block w-3 h-0.5 bg-emerald-400 rounded" />
                          New subscribers
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="inline-block w-3 h-0.5 bg-red-400 rounded" />
                          Churned
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-10 text-sm">
                      Failed to load chart
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Subscribers tab */}
            {tab === "subscribers" && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-base">Members</CardTitle>
                      <CardDescription>
                        {subscribersQ.data
                          ? `${subscribersQ.data.total} total`
                          : "Loading…"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Search email…"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        className="bg-input border border-border/60 rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setPage(1);
                        }}
                        className="bg-input border border-border/60 rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="canceled">Cancelled</option>
                        <option value="past_due">Past due</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {subscribersQ.isLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto -mx-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/50 text-muted-foreground text-left">
                              <th className="pb-3 px-2 font-medium">Email</th>
                              <th className="pb-3 px-2 font-medium">Status</th>
                              <th className="pb-3 px-2 font-medium">Plan</th>
                              <th className="pb-3 px-2 font-medium">Discord</th>
                              <th className="pb-3 px-2 font-medium whitespace-nowrap">
                                Joined
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(subscribersQ.data?.subscribers ?? []).length ===
                            0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="text-center text-muted-foreground py-10"
                                >
                                  No members found
                                </td>
                              </tr>
                            ) : (
                              subscribersQ.data?.subscribers.map((s) => (
                                <tr
                                  key={s.id}
                                  className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                                  onClick={() => setLocation(`${basePath}/admin/member/${s.id}`)}
                                >
                                  <td className="py-3 px-2 font-mono text-xs truncate max-w-[220px] text-primary hover:underline">
                                    {s.email}
                                  </td>
                                  <td className="py-3 px-2">
                                    <span
                                      className={`text-xs font-medium ${STATUS_COLORS[s.subscriptionStatus] ?? "text-muted-foreground"}`}
                                    >
                                      {STATUS_LABELS[s.subscriptionStatus] ??
                                        s.subscriptionStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 text-xs text-muted-foreground capitalize">
                                    {s.planTier ?? "—"}
                                  </td>
                                  <td className="py-3 px-2">
                                    {s.discordConnected ? (
                                      <span className="text-xs text-emerald-400">
                                        ✓{" "}
                                        {s.discordUsername
                                          ? `@${s.discordUsername}`
                                          : "linked"}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(s.joinedAt).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      },
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      {(subscribersQ.data?.total ?? 0) >
                        (subscribersQ.data?.limit ?? 50) && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">
                            Page {subscribersQ.data?.page} of{" "}
                            {Math.ceil(
                              (subscribersQ.data?.total ?? 0) /
                                (subscribersQ.data?.limit ?? 50),
                            )}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={page <= 1}
                              onClick={() => setPage((p) => p - 1)}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                page >=
                                Math.ceil(
                                  (subscribersQ.data?.total ?? 0) /
                                    (subscribersQ.data?.limit ?? 50),
                                )
                              }
                              onClick={() => setPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Win-back tab */}
            {tab === "winback" && (
              <div className="space-y-4">
                {winbackQ.isLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : winbackQ.data ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      <StatCard
                        label="Sequences"
                        value={winbackQ.data.total}
                      />
                      <StatCard
                        label="Sent"
                        value={winbackQ.data.sent}
                        sub={
                          winbackQ.data.total > 0
                            ? `${Math.round((winbackQ.data.sent / winbackQ.data.total) * 100)}%`
                            : "—"
                        }
                      />
                      <StatCard
                        label="Opened"
                        value={winbackQ.data.opened}
                        sub={
                          winbackQ.data.sent > 0
                            ? `${Math.round((winbackQ.data.opened / winbackQ.data.sent) * 100)}% open rate`
                            : "—"
                        }
                        accent="text-blue-400"
                      />
                      <StatCard
                        label="Clicked"
                        value={winbackQ.data.clicked}
                        sub={
                          winbackQ.data.sent > 0
                            ? `${Math.round((winbackQ.data.clicked / winbackQ.data.sent) * 100)}% click rate`
                            : "—"
                        }
                        accent="text-primary"
                      />
                      <StatCard
                        label="Rejoined"
                        value={winbackQ.data.rejoined}
                        sub="re-subscribed"
                        accent="text-emerald-400"
                      />
                    </div>
                    <Card className="border-border/50 bg-card/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">By Email</CardTitle>
                        <CardDescription>
                          Performance per win-back email in the sequence
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto -mx-2">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/50 text-muted-foreground text-left">
                                <th className="pb-3 px-2 font-medium">
                                  Email
                                </th>
                                <th className="pb-3 px-2 font-medium text-right">
                                  Total
                                </th>
                                <th className="pb-3 px-2 font-medium text-right">
                                  Sent
                                </th>
                                <th className="pb-3 px-2 font-medium text-right">
                                  Open rate
                                </th>
                                <th className="pb-3 px-2 font-medium text-right">
                                  Click rate
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {winbackQ.data.byType.map((row) => (
                                <tr
                                  key={row.jobType}
                                  className="border-b border-border/30 last:border-0"
                                >
                                  <td className="py-3 px-2 font-medium">
                                    {row.jobType === "winback_1"
                                      ? "Email 1 — Day 3 (50% off)"
                                      : row.jobType === "winback_2"
                                        ? "Email 2 — Day 10"
                                        : "Email 3 — Day 30"}
                                  </td>
                                  <td className="py-3 px-2 text-right text-muted-foreground">
                                    {row.total}
                                  </td>
                                  <td className="py-3 px-2 text-right text-muted-foreground">
                                    {row.sent}
                                  </td>
                                  <td className="py-3 px-2 text-right text-blue-400">
                                    {row.sent > 0
                                      ? `${Math.round((row.opened / row.sent) * 100)}%`
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-2 text-right text-primary">
                                    {row.sent > 0
                                      ? `${Math.round((row.clicked / row.sent) * 100)}%`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                              {winbackQ.data.byType.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="text-center text-muted-foreground py-8 text-sm"
                                  >
                                    No win-back emails sent yet
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    Failed to load win-back stats
                  </p>
                )}
              </div>
            )}

            {/* Survey tab */}
            {tab === "trials" && (
              <TrialsPanel />
            )}

            {tab === "coupons" && (
              <CouponsPanel />
            )}

            {tab === "reviews" && (
              <ReviewsPanel />
            )}

            {tab === "survey" && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">
                        Cancellation Reasons
                      </CardTitle>
                      <CardDescription>
                        {surveyQ.data
                          ? `${surveyQ.data.total} survey${surveyQ.data.total !== 1 ? "s" : ""} submitted · ${surveyQ.data.offerAcceptedCount} accepted the retention offer`
                          : "Loading…"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {surveyQ.isLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : surveyQ.data && surveyQ.data.total > 0 ? (
                    <SurveyPieChart reasons={surveyQ.data.reasons} />
                  ) : (
                    <p className="text-center text-muted-foreground py-10 text-sm">
                      No cancellation surveys submitted yet
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Member review moderation */}
            <div className="mt-8">
              <AdminReviews />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
