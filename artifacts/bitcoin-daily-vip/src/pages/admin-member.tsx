import { useState } from "react";
import { useUser } from "@/lib/clerk-compat";
import { useLocation, Link } from "wouter";
import {
  useGetMemberProfile,
  useAddMemberDays,
  useRefundMemberCharge,
  useCancelMemberSubscription,
  useResumeMemberSubscription,
  usePauseMemberSubscription,
  useResetMemberTrial,
  useChangeMemberPlan,
  useApplyMemberCoupon,
  useRemoveMemberDiscount,
  useListCoupons,
  ApiError,
  type LiveSubscriptionDetail,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";

const ADMIN_CLERK_USER_ID = "user_3DUHjlIjpjTtgh7t0H6PKwOqFLq";

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400",
  trialing: "text-blue-400",
  paused: "text-amber-400",
  past_due: "text-red-400",
  canceled: "text-red-400",
  none: "text-muted-foreground",
};

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ActionResult = { ok: boolean; message: string } | null;

function ActionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground min-w-[140px]">{label}</span>
      <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>
    </div>
  );
}

function ResultBadge({ result }: { result: ActionResult }) {
  if (!result) return null;
  return (
    <p className={`text-xs mt-1 ${result.ok ? "text-emerald-400" : "text-destructive"}`}>
      {result.message}
    </p>
  );
}

function LiveSubscriptionPanel({
  sub,
  subscriptionStatus,
}: {
  sub: LiveSubscriptionDetail;
  subscriptionStatus: string | null | undefined;
}) {
  const now = new Date();
  const trialEnd = sub.trialEnd ? new Date(sub.trialEnd) : null;
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const cancelAt = sub.cancelAt ? new Date(sub.cancelAt) : null;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Stripe Data</p>
        {sub.paused && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">PAUSED</span>
        )}
        {sub.cancelAtPeriodEnd && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
            CANCELS {cancelAt ? fmtDate(cancelAt.toISOString()) : "AT PERIOD END"}
          </span>
        )}
        {sub.discountId && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
            {sub.discountPercentOff ? `${sub.discountPercentOff}% OFF` : sub.discountAmountOff ? `$${(sub.discountAmountOff / 100).toFixed(0)} OFF` : "DISCOUNT"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {sub.currentPriceAmount != null && (
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-medium">
              {fmt(sub.currentPriceAmount, sub.currentPriceCurrency ?? "usd")}
              {sub.currentPriceInterval ? `/${sub.currentPriceInterval}` : ""}
            </p>
          </div>
        )}
        {trialEnd && (
          <div>
            <p className="text-xs text-muted-foreground">Trial ends</p>
            <p className={`font-medium ${trialEnd > now ? "text-blue-400" : "text-muted-foreground line-through"}`}>
              {fmtDate(sub.trialEnd!)}
            </p>
          </div>
        )}
        {periodEnd && (
          <div>
            <p className="text-xs text-muted-foreground">
              {sub.cancelAtPeriodEnd ? "Cancels" : "Next billing"}
            </p>
            <p className="font-medium">{fmtDate(sub.currentPeriodEnd!)}</p>
          </div>
        )}
        {sub.discountId && (
          <div>
            <p className="text-xs text-muted-foreground">Discount</p>
            <p className="font-medium text-purple-400">{sub.discountName ?? sub.discountId}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionControls({
  memberId,
  sub,
  subscriptionId,
  onSuccess,
}: {
  memberId: number;
  sub: LiveSubscriptionDetail | null | undefined;
  subscriptionId: string | null | undefined;
  onSuccess: () => void;
}) {
  const [cancelResult, setCancelResult] = useState<ActionResult>(null);
  const [resumeResult, setResumeResult] = useState<ActionResult>(null);
  const [pauseResult, setPauseResult] = useState<ActionResult>(null);
  const [resetResult, setResetResult] = useState<ActionResult>(null);
  const [planResult, setPlanResult] = useState<ActionResult>(null);
  const [couponResult, setCouponResult] = useState<ActionResult>(null);
  const [discountResult, setDiscountResult] = useState<ActionResult>(null);

  const [confirmCancel, setConfirmCancel] = useState<"period_end" | "immediately" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [selectedCoupon, setSelectedCoupon] = useState("");

  const wrap =
    (setter: (r: ActionResult) => void) =>
    (data: { success: boolean; message: string }) => {
      setter({ ok: data.success, message: data.message });
      if (data.success) onSuccess();
    };
  const wrapErr =
    (setter: (r: ActionResult) => void) => (err: unknown) =>
      setter({ ok: false, message: err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Action failed" });

  const cancelMutation = useCancelMemberSubscription({ mutation: { onSuccess: (d) => { setConfirmCancel(null); wrap(setCancelResult)(d); }, onError: wrapErr(setCancelResult) } });
  const resumeMutation = useResumeMemberSubscription({ mutation: { onSuccess: wrap(setResumeResult), onError: wrapErr(setResumeResult) } });
  const pauseMutation = usePauseMemberSubscription({ mutation: { onSuccess: wrap(setPauseResult), onError: wrapErr(setPauseResult) } });
  const resetMutation = useResetMemberTrial({ mutation: { onSuccess: (d) => { setConfirmReset(false); wrap(setResetResult)(d); }, onError: wrapErr(setResetResult) } });
  const planMutation = useChangeMemberPlan({ mutation: { onSuccess: wrap(setPlanResult), onError: wrapErr(setPlanResult) } });
  const couponMutation = useApplyMemberCoupon({ mutation: { onSuccess: wrap(setCouponResult), onError: wrapErr(setCouponResult) } });
  const discountMutation = useRemoveMemberDiscount({ mutation: { onSuccess: wrap(setDiscountResult), onError: wrapErr(setDiscountResult) } });

  const { data: couponsData } = useListCoupons();
  const coupons = couponsData?.coupons ?? [];

  const hasSubscription = !!subscriptionId;
  const isPaused = sub?.paused ?? false;
  const isCancelAtPeriodEnd = sub?.cancelAtPeriodEnd ?? false;
  const hasDiscount = !!sub?.discountId;

  return (
    <div className="space-y-1">
      {/* Live data panel */}
      {sub && <LiveSubscriptionPanel sub={sub} subscriptionStatus={null} />}
      {!sub && !hasSubscription && (
        <p className="text-xs text-muted-foreground py-2">No active subscription — controls are disabled.</p>
      )}

      {/* ── Lifecycle ── */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lifecycle</p>

        {/* Cancel at period end / Undo */}
        <ActionRow label="Schedule cancel">
          {!isCancelAtPeriodEnd ? (
            confirmCancel === "period_end" ? (
              <>
                <span className="text-xs text-amber-400">Cancel at period end?</span>
                <Button size="sm" variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate({ id: memberId, data: { immediately: false } })}>
                  {cancelMutation.isPending ? "…" : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(null)}>No</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={!hasSubscription} onClick={() => { setCancelResult(null); setConfirmCancel("period_end"); }}>
                Cancel at period end
              </Button>
            )
          ) : (
            <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" disabled={!hasSubscription || resumeMutation.isPending} onClick={() => { setResumeResult(null); resumeMutation.mutate({ id: memberId }); }}>
              {resumeMutation.isPending ? "Undoing…" : "Undo scheduled cancel"}
            </Button>
          )}
        </ActionRow>
        {cancelResult?.message && !cancelResult.ok && <ResultBadge result={cancelResult} />}
        {resumeResult && <ResultBadge result={resumeResult} />}

        {/* Cancel immediately */}
        <ActionRow label="Cancel now">
          {confirmCancel === "immediately" ? (
            <>
              <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> This cannot be undone.</span>
              <Button size="sm" variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate({ id: memberId, data: { immediately: true } })}>
                {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel now"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(null)}>No</Button>
            </>
          ) : (
            <Button size="sm" variant="destructive" disabled={!hasSubscription} onClick={() => { setCancelResult(null); setConfirmCancel("immediately"); }}>
              Cancel immediately
            </Button>
          )}
        </ActionRow>
        {cancelResult && cancelResult.ok && <ResultBadge result={cancelResult} />}

        {/* Pause / Resume */}
        <ActionRow label="Billing pause">
          {!isPaused ? (
            <Button size="sm" variant="outline" disabled={!hasSubscription || pauseMutation.isPending} onClick={() => { setPauseResult(null); pauseMutation.mutate({ id: memberId }); }}>
              {pauseMutation.isPending ? "Pausing…" : "Pause billing"}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" disabled={resumeMutation.isPending} onClick={() => { setResumeResult(null); resumeMutation.mutate({ id: memberId }); }}>
              {resumeMutation.isPending ? "Resuming…" : "Resume billing"}
            </Button>
          )}
        </ActionRow>
        {pauseResult && <ResultBadge result={pauseResult} />}
      </div>

      {/* ── Trial reset ── */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Trial</p>
        <ActionRow label="Reset trial">
          {confirmReset ? (
            <>
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Cancels sub + clears trial history.
              </span>
              <Button size="sm" variant="destructive" disabled={resetMutation.isPending} onClick={() => resetMutation.mutate({ id: memberId })}>
                {resetMutation.isPending ? "Resetting…" : "Confirm reset"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Cancels sub + clears trial_started_at so they can start fresh</span>
              <Button size="sm" variant="destructive" onClick={() => { setResetResult(null); setConfirmReset(true); }}>
                Reset trial
              </Button>
            </>
          )}
        </ActionRow>
        {resetResult && <ResultBadge result={resetResult} />}
      </div>

      {/* ── Plan change ── */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
        <ActionRow label="Change plan">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            disabled={!hasSubscription}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            <option value="monthly">Monthly (VIP)</option>
            <option value="yearly">Yearly (VIP)</option>
            <option value="premium">Premium (monthly)</option>
            <option value="premium-yearly">Premium (yearly)</option>
          </select>
          <Button
            size="sm"
            disabled={!hasSubscription || planMutation.isPending}
            onClick={() => { setPlanResult(null); planMutation.mutate({ id: memberId, data: { priceType: selectedPlan } }); }}
          >
            {planMutation.isPending ? "Changing…" : "Apply plan"}
          </Button>
        </ActionRow>
        {planResult && <ResultBadge result={planResult} />}
      </div>

      {/* ── Discount / Coupon ── */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Discount</p>

        {/* Apply coupon */}
        <ActionRow label="Apply coupon">
          <select
            value={selectedCoupon}
            onChange={(e) => setSelectedCoupon(e.target.value)}
            disabled={!hasSubscription || coupons.length === 0}
            className="rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 max-w-[200px]"
          >
            <option value="">Select coupon…</option>
            {coupons.filter((c) => c.valid).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
                {c.percentOff ? ` (${c.percentOff}% off)` : c.amountOff ? ` ($${(c.amountOff / 100).toFixed(0)} off)` : ""}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!hasSubscription || !selectedCoupon || couponMutation.isPending}
            onClick={() => { setCouponResult(null); couponMutation.mutate({ id: memberId, data: { couponId: selectedCoupon } }); }}
          >
            {couponMutation.isPending ? "Applying…" : "Apply"}
          </Button>
        </ActionRow>
        {couponResult && <ResultBadge result={couponResult} />}

        {/* Remove discount */}
        {hasDiscount && (
          <>
            <ActionRow label="Remove discount">
              <span className="text-xs text-muted-foreground">{sub?.discountName ?? sub?.discountId}</span>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                disabled={discountMutation.isPending}
                onClick={() => { setDiscountResult(null); discountMutation.mutate({ id: memberId }); }}
              >
                {discountMutation.isPending ? "Removing…" : "Remove discount"}
              </Button>
            </ActionRow>
            {discountResult && <ResultBadge result={discountResult} />}
          </>
        )}
      </div>
    </div>
  );
}

function AddDaysSection({ memberId, email }: { memberId: number; email: string }) {
  const [days, setDays] = useState(7);
  const [result, setResult] = useState<ActionResult>(null);

  const mutation = useAddMemberDays({
    mutation: {
      onSuccess: (data) => setResult({ ok: true, message: data.message }),
      onError: (err) => setResult({ ok: false, message: err instanceof Error ? err.message : "Failed" }),
    },
  });

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Add Free Access Days</p>
      <p className="text-xs text-muted-foreground">
        Extends {email}'s manual trial. Days stack on top of any existing manual trial.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-24 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-1.5">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                days === d
                  ? "bg-primary/20 border-primary/60 text-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <Button
          size="sm"
          disabled={days < 1 || mutation.isPending}
          onClick={() => mutation.mutate({ id: memberId, data: { days } })}
        >
          {mutation.isPending ? "Adding…" : `Add ${days} Day${days !== 1 ? "s" : ""}`}
        </Button>
      </div>
      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-400" : "text-destructive"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

function RefundSection({
  memberId,
  charges,
  onRefunded,
}: {
  memberId: number;
  charges: Array<{ id: string; amount: number; currency: string; refunded: boolean; amountRefunded: number; created: string }>;
  onRefunded: () => void;
}) {
  const [selectedCharge, setSelectedCharge] = useState<string>("");
  const [partial, setPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [result, setResult] = useState<ActionResult>(null);

  const refundable = charges.filter((c) => !c.refunded);

  const mutation = useRefundMemberCharge({
    mutation: {
      onSuccess: (data) => {
        setResult({ ok: true, message: data.message });
        onRefunded();
      },
      onError: (err) => setResult({ ok: false, message: err instanceof Error ? err.message : "Refund failed" }),
    },
  });

  if (refundable.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Issue Refund</p>
        <p className="text-xs text-muted-foreground">No refundable charges found.</p>
      </div>
    );
  }

  const selectedChargeFull = refundable.find((c) => c.id === selectedCharge);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Issue Refund</p>
      <select
        value={selectedCharge}
        onChange={(e) => { setSelectedCharge(e.target.value); setResult(null); }}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">Select a charge to refund…</option>
        {refundable.map((c) => (
          <option key={c.id} value={c.id}>
            {fmt(c.amount, c.currency)} — {fmtDate(c.created)} ({c.id.slice(0, 16)}…)
          </option>
        ))}
      </select>

      {selectedChargeFull && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={partial}
              onChange={(e) => setPartial(e.target.checked)}
              className="rounded border-border"
            />
            Partial refund
          </label>
          {partial && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">$</span>
              <input
                type="number"
                min={0.01}
                max={selectedChargeFull.amount / 100}
                step={0.01}
                placeholder="0.00"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                className="w-24 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}
          <Button
            size="sm"
            variant="destructive"
            disabled={mutation.isPending || !selectedCharge || (partial && !partialAmount)}
            onClick={() =>
              mutation.mutate({
                id: memberId,
                data: {
                  chargeId: selectedCharge,
                  ...(partial && partialAmount
                    ? { amount: Math.round(parseFloat(partialAmount) * 100) }
                    : {}),
                },
              })
            }
          >
            {mutation.isPending
              ? "Refunding…"
              : partial && partialAmount
              ? `Refund $${parseFloat(partialAmount).toFixed(2)}`
              : `Refund ${fmt(selectedChargeFull.amount, selectedChargeFull.currency)} (full)`}
          </Button>
        </div>
      )}

      {result && (
        <p className={`text-xs ${result.ok ? "text-emerald-400" : "text-destructive"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export default function AdminMember({ id }: { id: number }) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [refetchKey, setRefetchKey] = useState(0);

  const isAdmin = user?.id === ADMIN_CLERK_USER_ID;

  const { data, isLoading, error, refetch } = useGetMemberProfile(id, {
    query: { queryKey: ["memberProfile", id, refetchKey] },
  });

  const handleRefetch = () => {
    setRefetchKey((k) => k + 1);
    refetch();
  };

  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </button>
          </Link>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof ApiError ? error.message : "Failed to load member"}
          </div>
        )}

        {data && (
          <>
            {/* Header card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-xl">{data.email}</CardTitle>
                    <CardDescription className="mt-1">Member ID #{data.id}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleRefetch} className="text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <span className={`text-sm font-semibold ${STATUS_COLORS[data.subscriptionStatus ?? "none"] ?? "text-muted-foreground"}`}>
                      {data.liveSubscription?.paused ? "⏸ paused" : `● ${data.subscriptionStatus ?? "No Subscription"}`}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plan</dt>
                    <dd className="font-medium capitalize">{data.planTier ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Joined</dt>
                    <dd className="font-medium">{fmtDate(data.joinedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Discord</dt>
                    <dd className="font-medium">
                      {data.discordConnected
                        ? <span className="text-emerald-400">✓ {data.discordUsername ? `@${data.discordUsername}` : "Linked"}</span>
                        : <span className="text-muted-foreground">Not linked</span>}
                    </dd>
                  </div>
                  {data.manualTrialEndsAt && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Manual Trial</dt>
                      <dd className={`font-medium ${new Date(data.manualTrialEndsAt) > new Date() ? "text-blue-400" : "text-muted-foreground line-through"}`}>
                        {fmtDate(data.manualTrialEndsAt)}
                      </dd>
                    </div>
                  )}
                  {data.stripeCustomerId && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stripe Customer</dt>
                      <dd className="font-mono text-xs text-muted-foreground">{data.stripeCustomerId}</dd>
                    </div>
                  )}
                  {data.subscriptionId && (
                    <div>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Subscription</dt>
                      <dd className="font-mono text-xs text-muted-foreground">{data.subscriptionId.slice(0, 20)}…</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Subscription controls card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Subscription Controls</CardTitle>
                <CardDescription>
                  Manage this member's Stripe subscription directly — changes apply in real time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionControls
                  memberId={data.id}
                  sub={data.liveSubscription ?? null}
                  subscriptionId={data.subscriptionId}
                  onSuccess={handleRefetch}
                />
              </CardContent>
            </Card>

            {/* Access actions card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Access Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <AddDaysSection memberId={data.id} email={data.email} />
                <div className="border-t border-border/30 pt-4">
                  <RefundSection
                    memberId={data.id}
                    charges={data.charges}
                    onRefunded={handleRefetch}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Charge history */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment History</CardTitle>
                <CardDescription>
                  {data.charges.length === 0
                    ? "No charges found"
                    : `${data.charges.length} charge${data.charges.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.charges.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No payment history yet
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground text-left">
                          <th className="pb-3 px-2 font-medium">Date</th>
                          <th className="pb-3 px-2 font-medium">Amount</th>
                          <th className="pb-3 px-2 font-medium">Status</th>
                          <th className="pb-3 px-2 font-medium">Refunded</th>
                          <th className="pb-3 px-2 font-medium">Charge ID</th>
                          <th className="pb-3 px-2 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.charges.map((c) => (
                          <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                            <td className="py-3 px-2 whitespace-nowrap text-muted-foreground">
                              {fmtDate(c.created)}
                            </td>
                            <td className="py-3 px-2 font-medium">
                              {fmt(c.amount, c.currency)}
                            </td>
                            <td className="py-3 px-2">
                              <span className={`text-xs font-medium capitalize ${
                                c.status === "succeeded" ? "text-emerald-400"
                                : c.status === "failed" ? "text-destructive"
                                : "text-muted-foreground"
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-xs">
                              {c.refunded ? (
                                <span className="text-amber-400">
                                  Full {c.amountRefunded > 0 ? `(${fmt(c.amountRefunded, c.currency)})` : ""}
                                </span>
                              ) : c.amountRefunded > 0 ? (
                                <span className="text-amber-400">Partial ({fmt(c.amountRefunded, c.currency)})</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                              {c.id.slice(0, 20)}…
                            </td>
                            <td className="py-3 px-2">
                              {c.receiptUrl ? (
                                <a href={c.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
