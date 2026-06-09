import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/lib/clerk-compat";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { PortalLayout } from "@/components/portal-layout";
import { TradeLogger } from "@/components/trade-logger";
import { ReviewPrompt } from "@/components/review-prompt";
import { track } from "@/lib/analytics";
import {
  useGetSubscriptionStatus,
  useCreateCheckoutSession,
  useCreatePortalSession,
  usePauseSubscription,
  useResumeSubscription,
  useReactivateSubscription,
  useSubmitCancellationSurvey,
  useGetDiscordStatus,
  useDisconnectDiscord,
  useChangePlan,
  type CheckoutSessionRequestPriceType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";
import { ExternalLink, CheckCircle2, Circle, BookOpen, BarChart2, Bell, GraduationCap, ChevronRight, AlertCircle, Timer, Zap, MessageSquare, TrendingUp, CalendarClock, Shield, Star, Bot, Send, X, Trash2, ChevronDown, HelpCircle, FileText, LifeBuoy, ChevronUp, CreditCard } from "lucide-react";

type Trade = { date: string; status: "win" | "loss" | "breakeven"; pl: number };

const fadeInUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };

// ── Update this whenever you want to post a new announcement ────────────────
const ANNOUNCEMENTS = [
  {
    id: "welcome-may-2026",
    date: "May 2026",
    title: "Welcome to your member portal",
    body: "Discord is where all live signals, morning market analysis, and trade updates are posted. Connect your Discord account below to get your VIP role and unlock access.",
  },
];


const CANCEL_REASONS = [
  "Too expensive",
  "Not getting enough value",
  "Not enough time to use it",
  "Found a better alternative",
  "Taking a break from trading",
  "Other",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "text-emerald-400" },
  trialing: { label: "Trial", color: "text-blue-400" },
  paused: { label: "Paused", color: "text-amber-400" },
  past_due: { label: "Past Due", color: "text-red-400" },
  canceled: { label: "Cancelled", color: "text-red-400" },
  none: { label: "No Subscription", color: "text-muted-foreground" },
};

const GS_STORAGE_KEY = "bdv_gs_progress";
const GS_TOTAL = 5;

function useGettingStartedProgress() {
  const [count, setCount] = useState(() => {
    try {
      const saved = localStorage.getItem(GS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]).length : 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    // Sync authoritative progress from server
    fetch(`${import.meta.env.BASE_URL}api/user/progress`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { completed: string[] } | null) => {
        if (data?.completed) {
          localStorage.setItem(GS_STORAGE_KEY, JSON.stringify(data.completed));
          setCount(data.completed.length);
        }
      })
      .catch(() => { /* Use localStorage fallback */ });

    function sync() {
      try {
        const saved = localStorage.getItem(GS_STORAGE_KEY);
        setCount(saved ? (JSON.parse(saved) as string[]).length : 0);
      } catch { /* ignore */ }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return count;
}


function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Portal() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const gsCompleted = useGettingStartedProgress();

  // Session-based welcome greeting — fires once per browser session for returning members
  useEffect(() => {
    const firstName = user?.firstName;
    if (!firstName) return;
    const SESSION_KEY = "bdv_session_welcomed";
    const VISITED_KEY = "bdv_ever_visited";
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      if (localStorage.getItem(VISITED_KEY)) {
        toast({ title: `${getGreeting()}, ${firstName}! 👋`, description: "Your signals and analysis are ready." });
      }
      localStorage.setItem(VISITED_KEY, "1");
    }
  }, [user?.firstName]);

  // ── Support Hub Modal ──────────────────────────────────────────────────────
  type SupportStep = "hub" | "faq" | "ticket" | "done";
  const [supportStep, setSupportStep] = useState<SupportStep | null>(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [openTickets, setOpenTickets] = useState<Array<{ id: number; subject: string; status: string; createdAt: string }>>([]);
  const [faqOpenId, setFaqOpenId] = useState<number | null>(null);

  const SUPPORT_FAQS = [
    { id: 1, q: "How do I access the VIP Discord?", a: "Go to your portal dashboard and click 'Connect Discord'. Authorize your account and your VIP role is assigned automatically within a minute." },
    { id: 2, q: "When are signals posted?", a: "Signals are posted every morning before market open (typically 8–9am ET) and whenever high-probability setups appear intraday. You'll get a ping in Discord." },
    { id: 3, q: "How do I cancel or pause my subscription?", a: "Go to your portal dashboard → Manage Subscription. You can pause for up to 30 days or cancel anytime — no fees, no penalties." },
    { id: 4, q: "My Discord role isn't showing. What do I do?", a: "Try disconnecting and reconnecting Discord from the portal. If it still doesn't work after a few minutes, open a ticket and we'll fix it manually." },
    { id: 5, q: "Can I upgrade from VIP to VIP Premium?", a: "Yes. From your portal go to Subscription → Change Plan and select VIP Premium. The upgrade is prorated — you only pay the difference for the current billing period." },
    { id: 6, q: "How do I get a refund?", a: "We offer refunds within 7 days of your first charge. Open a ticket with subject 'Refund Request' and we'll process it within 1 business day." },
  ];

  function openSupport() { setSupportStep("hub"); }

  function closeSupport() {
    setSupportStep(null);
    setTicketSubject("");
    setTicketMessage("");
    setTicketError(null);
  }

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSubmitting(true);
    setTicketError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/support/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: ticketSubject, message: ticketMessage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to submit");
      }
      try {
        const tRes = await fetch(`${import.meta.env.BASE_URL}api/support/tickets`, { credentials: "include" });
        if (tRes.ok) setOpenTickets(await tRes.json());
      } catch { /* non-fatal */ }
      setSupportStep("done");
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setTicketSubmitting(false);
    }
  }

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelStep, setCancelStep] = useState<"survey" | "offer" | "done">(
    "survey",
  );
  const [offerMessage, setOfferMessage] = useState("");
  const [discordNotice, setDiscordNotice] = useState<"connected" | "error" | null>(null);
  const [discordLinking, setDiscordLinking] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [refundAgreed, setRefundAgreed] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<CheckoutSessionRequestPriceType>("monthly");
  const [pendingCoupon, setPendingCoupon] = useState<string | undefined>();

  const [liveStats, setLiveStats] = useState<{
    winRate: number;
    avgMonthlyReturnMin: number;
    avgMonthlyReturnMax: number;
    tradesPerMonth: number;
    bestStreak: number;
    profitFactor: number;
    instruments: { ticker: string; winRate: number }[];
  } | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  // ── AI Support Chat ──────────────────────────────────────────────────────
  type ChatMessage = { role: "user" | "assistant"; content: string; streaming?: boolean };
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [chatUnread, setChatUnread] = useState(() => {
    try { return !sessionStorage.getItem("bdv_chat_opened"); } catch { return true; }
  });
  const [chatBouncing, setChatBouncing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Trigger bounce animation shortly after portal loads, if chat hasn't been opened yet
  useEffect(() => {
    const t1 = setTimeout(() => setChatBouncing(true), 1800);
    const t2 = setTimeout(() => setChatBouncing(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const initChat = useCallback(async () => {
    if (chatInitialized) return;
    setChatLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/openai/support-conversation`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = (await res.json()) as {
        id: number;
        messages: { role: string; content: string }[];
      };
      setChatConvId(data.id);
      setChatMessages(
        data.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
      setChatInitialized(true);
    } catch {
      toast({ title: "Couldn't load chat", description: "Please try again.", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  }, [chatInitialized]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    setChatUnread(false);
    setChatBouncing(false);
    try { sessionStorage.setItem("bdv_chat_opened", "1"); } catch { /* ignore */ }
    initChat();
  }, [initChat]);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatOpen, chatMessages.length]);

  const sendChatMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !chatConvId) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/openai/conversations/${chatConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: text }),
        }
      );
      if (!res.ok || !res.body) throw new Error("Stream failed");

      setChatMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          const event = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
          if (event.content) {
            setChatMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + event.content };
              return copy;
            });
          }
          if (event.done) {
            setChatMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") copy[copy.length - 1] = { ...last, streaming: false };
              return copy;
            });
          }
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatConvId]);

  const clearChat = useCallback(async () => {
    if (!chatConvId) return;
    try {
      await fetch(`${import.meta.env.BASE_URL}api/openai/conversations/${chatConvId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setChatMessages([]);
    } catch {
      toast({ title: "Couldn't clear chat", variant: "destructive" });
    }
  }, [chatConvId]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/public/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setLiveStats(d))
      .catch(() => {});
    fetch(`${import.meta.env.BASE_URL}api/public/trades`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: { trades: Trade[] } | null) => d?.trades && setTrades(d.trades))
      .catch(() => {});
  }, []);

  const recentStats = (() => {
    if (!trades.length) return null;
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    const maxN = sorted.length;
    let best: { wins: number; losses: number; total: number; winRate: number; pl: number; tradeCount: number } | null = null;
    for (let n = 10; n <= maxN; n++) {
      const slice = sorted.slice(-n);
      const wins = slice.filter((t) => t.status === "win").length;
      const losses = slice.filter((t) => t.status === "loss").length;
      const total = wins + losses;
      if (total < 8) continue;
      const winRate = Math.round((wins / total) * 100);
      if (winRate < 70) continue;
      const pl = slice.reduce((sum, t) => sum + t.pl, 0);
      if (pl <= 0) continue; // the "on a heater" panel must be genuinely profitable
      if (!best || winRate > best.winRate || (winRate === best.winRate && total > best.tradeCount)) {
        best = { wins, losses, total, winRate, pl, tradeCount: total };
      }
    }
    return best;
  })();

  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("bdv_dismissed_announcements");
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set();
    } catch { return new Set(); }
  });

  function dismissAnnouncement(id: string) {
    setDismissedAnnouncements((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("bdv_dismissed_announcements", JSON.stringify([...next]));
      return next;
    });
  }

  // Handle ?discord= and ?session_id= callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("discord");
    if (result === "connected" || result === "error") {
      setDiscordNotice(result);
    }
    const sessionId = params.get("session_id");
    if (sessionId) {
      setShowWelcome(true);
      // Clear the URL immediately so it doesn't linger
      window.history.replaceState(null, "", window.location.pathname);

      // Hit the status endpoint with session_id so the server can look up the
      // subscription directly from Stripe and persist it — bypassing the webhook race.
      const activateFromSession = async () => {
        try {
          const r = await fetch(
            `${import.meta.env.BASE_URL}api/subscription/status?session_id=${encodeURIComponent(sessionId)}`,
          );
          if (r.ok) {
            const data = await r.json();
            if (data.status === "trialing" || data.status === "active") {
              // Force React Query to refetch with the now-updated DB record
              await queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
              return;
            }
          }
        } catch {/* ignore */}

        // Fallback: poll every 2s for up to 20s in case webhook is slightly delayed
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            await queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
          } catch {/* ignore */}
          if (attempts >= 10) clearInterval(interval);
        }, 2000);
      };

      activateFromSession();

      // Send welcome email (fire-and-forget)
      fetch(`${import.meta.env.BASE_URL}api/checkout/welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    } else if (result) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Pre-select plan from pricing page intent
    const planIntent = localStorage.getItem("bdv_plan_intent");
    if (planIntent === "premium") setPlanType("premium");
    if (planIntent) localStorage.removeItem("bdv_plan_intent");
  }, []);

  useEffect(() => {
    document.title = "Member Portal | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  const { data: status, isLoading } = useGetSubscriptionStatus({
    query: { queryKey: ["subscriptionStatus"] },
  });

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [planType, setPlanType] = useState<"vip" | "premium">("vip");

  // Live trial countdown — ticks every second
  const [trialCountdown, setTrialCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (status?.status !== "trialing" || !status.currentPeriodEnd) return;
    const end = new Date(status.currentPeriodEnd).getTime();
    const calc = () => {
      const diff = Math.max(0, end - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTrialCountdown({ d, h, m, s });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [status?.status, status?.currentPeriodEnd]);
  const selectedPlan = billing === "yearly"
    ? (planType === "premium" ? "premium-yearly" : "yearly")
    : (planType === "premium" ? "premium" : "monthly");

  const [autoCheckoutError, setAutoCheckoutError] = useState(false);
  const autoCheckoutFired = useRef(false);

  const checkoutMutation = useCreateCheckoutSession({
    mutation: {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: () => {
        setAutoCheckoutError(true);
      },
    },
  });

  function requestCheckout(plan: CheckoutSessionRequestPriceType, coupon?: string) {
    track("Checkout Started", { plan });
    setPendingPlan(plan);
    setPendingCoupon(coupon);
    setTosAgreed(false);
    setRefundAgreed(false);
    setTosModalOpen(true);
  }

  // Auto-trigger checkout when user arrives from the sign-up/sign-in flow.
  // Checks BOTH ?checkout=1 URL param AND bdv_checkout_intent in localStorage
  // so that Google OAuth multi-hop redirects (which can strip query params) still work.
  useEffect(() => {
    if (!status) return;
    if (autoCheckoutFired.current) return;

    const params = new URLSearchParams(window.location.search);
    const hasUrlIntent = params.has("checkout");
    const hasStorageIntent = localStorage.getItem("bdv_checkout_intent") === "1";

    if (!hasUrlIntent && !hasStorageIntent) return;

    // Clean up both signals so a refresh or back-nav doesn't retrigger
    window.history.replaceState({}, "", window.location.pathname);
    localStorage.removeItem("bdv_checkout_intent");

    if (status.status !== "none") {
      // Already subscribed — nothing to do
      return;
    }

    autoCheckoutFired.current = true;
    const validPlans: CheckoutSessionRequestPriceType[] = ["monthly", "yearly", "premium", "premium-yearly"];
    const raw = localStorage.getItem("bdv_plan_intent") ?? "monthly";
    const plan: CheckoutSessionRequestPriceType = validPlans.includes(raw as CheckoutSessionRequestPriceType)
      ? (raw as CheckoutSessionRequestPriceType)
      : "monthly";
    requestCheckout(plan);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const portalMutation = useCreatePortalSession({
    mutation: {
      onSuccess: (data) => {
        window.open(data.url, "_blank", "noopener,noreferrer");
      },
    },
  });

  const pauseMutation = usePauseSubscription({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
      },
    },
  });

  const resumeMutation = useResumeSubscription({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
      },
    },
  });

  const reactivateMutation = useReactivateSubscription({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
      },
    },
  });

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [pendingPlanType, setPendingPlanType] = useState<string | null>(null);

  const changePlanMutation = useChangePlan({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
        setShowChangePlan(false);
        setPendingPlanType(null);
        const PLAN_NAMES: Record<string, string> = {
          monthly: "VIP",
          yearly: "VIP Yearly",
          premium: "VIP Premium",
          "premium-yearly": "VIP Premium Yearly",
        };
        const name = PLAN_NAMES[(variables.data as { priceType: string }).priceType] ?? "your new plan";
        const sc = (data as unknown as { scheduledPlanChange?: { planTier: string | null; date: string } }).scheduledPlanChange;
        if (sc?.date) {
          const switchDate = new Date(sc.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          toast({ title: `${name} scheduled`, description: `Switches on ${switchDate}. You keep full access until then.` });
        } else {
          toast({ title: `Switched to ${name}`, description: "A confirmation email is on its way." });
        }
      },
    },
  });

  const { data: discordStatus, refetch: refetchDiscord } = useGetDiscordStatus({
    query: { queryKey: ["discordStatus"] },
  });

  const disconnectMutation = useDisconnectDiscord({
    mutation: {
      onSuccess: () => {
        refetchDiscord();
      },
    },
  });

  function handleConnectDiscord() {
    setDiscordLinking(true);
    window.location.href = "/api/discord/oauth/redirect";
  }

  const surveyMutation = useSubmitCancellationSurvey({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["subscriptionStatus"] });
        if (variables.data.offerAccepted) {
          setOfferMessage(
            "20% discount applied for your next 2 billing cycles. Welcome back!",
          );
          setCancelStep("done");
        } else {
          setOfferMessage(
            `Your membership will end on ${data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString() : "your next billing date"}.`,
          );
          setCancelStep("done");
        }
      },
    },
  });

  function openCancelModal() {
    setCancelStep("survey");
    setCancelReason(CANCEL_REASONS[0]);
    setOfferMessage("");
    setCancelModalOpen(true);
  }

  function handleSurveyNext() {
    setCancelStep("offer");
  }

  function handleAcceptOffer() {
    surveyMutation.mutate({ data: { reason: cancelReason, offerAccepted: true } });
  }

  function handleCancelAnyway() {
    surveyMutation.mutate({ data: { reason: cancelReason, offerAccepted: false } });
  }

  function closeCancelModal() {
    setCancelModalOpen(false);
    setCancelStep("survey");
  }

  const statusInfo = STATUS_LABELS[status?.status ?? "none"] ??
    STATUS_LABELS["none"];
  const hasActiveSub =
    status?.status === "active" ||
    status?.status === "trialing" ||
    status?.status === "paused" ||
    status?.status === "past_due";

  const formattedPeriodEnd = status?.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const formattedResumeDate = status?.resumeDate
    ? new Date(status.resumeDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const PLAN_INFO: Record<string, { name: string; price: string; monthlyBase: number }> = {
    monthly:          { name: "VIP",                price: "$99/mo",              monthlyBase: 99  },
    yearly:           { name: "VIP Yearly",         price: "$82/mo · $990/yr",    monthlyBase: 82  },
    premium:          { name: "VIP Premium",        price: "$199/mo",             monthlyBase: 199 },
    "premium-yearly": { name: "VIP Premium Yearly", price: "$166/mo · $1,990/yr", monthlyBase: 166 },
    // legacy value stored before plan-tiers system — treat as VIP monthly
    vip:              { name: "VIP",                price: "$99/mo",              monthlyBase: 99  },
  };
  // Normalise legacy "vip" → "monthly" so plan selectors work correctly
  const normalisedPlanTier =
    status?.planTier === "vip" ? "monthly" : (status?.planTier ?? null);
  const planInfo = PLAN_INFO[normalisedPlanTier ?? ""] ?? PLAN_INFO.monthly;
  const discountedPrice = (planInfo.monthlyBase * 0.8).toFixed(2).replace(/\.00$/, "");

  const trialDaysLeft =
    status?.status === "trialing" && status.currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(status.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  return (
    <PortalLayout onOpenChat={openChat} onOpenTicket={openSupport}>
      <main className="container max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-8">

        {/* ── ToS acceptance modal ─────────────────────────────────── */}
        {tosModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl p-6 space-y-5">
              <div>
                <p className="text-lg font-bold tracking-tight">Before you continue</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please review and accept our terms before proceeding to checkout.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={tosAgreed}
                    onChange={(e) => setTosAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    I have read and agree to the{" "}
                    <a
                      href={`${basePath}/terms`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={refundAgreed}
                    onChange={(e) => setRefundAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                    I understand the{" "}
                    <strong className="text-foreground">refund policy</strong>
                    {": "}
                    subscriptions are non-refundable after the 7-day free trial ends. You may cancel at any time before the trial expires and will not be charged.
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  className="w-full font-semibold shadow-[0_0_20px_rgba(247,147,26,0.25)]"
                  size="lg"
                  disabled={!tosAgreed || !refundAgreed || checkoutMutation.isPending}
                  onClick={() => {
                    setTosModalOpen(false);
                    checkoutMutation.mutate({
                      data: {
                        priceType: pendingPlan,
                        ...(pendingCoupon ? { couponCode: pendingCoupon } : {}),
                      },
                    });
                  }}
                >
                  {checkoutMutation.isPending ? "Redirecting…" : "Continue to Checkout"}
                </Button>
                <button
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                  onClick={() => setTosModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Auto-checkout redirect overlay ───────────────────────── */}
        {checkoutMutation.isPending && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm gap-6">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-bold">Taking you to checkout…</p>
              <p className="text-sm text-muted-foreground mt-1">Hang tight — we're opening Stripe now.</p>
            </div>
          </div>
        )}

        {/* ── Auto-checkout error banner ────────────────────────────── */}
        {autoCheckoutError && status?.status === "none" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-destructive">Checkout didn't open automatically</p>
              <p className="text-sm text-muted-foreground mt-0.5">Something went wrong starting your session. Click below to try again.</p>
            </div>
            <Button
              onClick={() => {
                setAutoCheckoutError(false);
                const validPlans2: CheckoutSessionRequestPriceType[] = ["monthly", "yearly", "premium", "premium-yearly"];
                const raw2 = localStorage.getItem("bdv_plan_intent") ?? "monthly";
                const plan2: CheckoutSessionRequestPriceType = validPlans2.includes(raw2 as CheckoutSessionRequestPriceType)
                  ? (raw2 as CheckoutSessionRequestPriceType)
                  : "monthly";
                requestCheckout(plan2);
              }}
              className="shrink-0"
            >
              Retry Checkout
            </Button>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.firstName ? `${getGreeting()}, ${user.firstName}!` : "Member Portal"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.firstName
              ? "Welcome back to your Bitcoin Daily VIP membership."
              : "Manage your Bitcoin Daily VIP membership"}
          </p>

          {/* ── Compact plan status strip — always visible at top ─── */}
          {hasActiveSub && !isLoading && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* Plan name badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${
                planInfo.name.toLowerCase().includes("premium")
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-primary/15 text-primary border-primary/30"
              }`}>
                {planInfo.name}
                <span className="font-normal opacity-70">· {planInfo.price}</span>
              </span>

              {/* Status pill */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                status?.status === "trialing"
                  ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                  : status?.status === "active"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : status?.status === "paused"
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border/50"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status?.status === "trialing"
                  ? trialDaysLeft !== null
                    ? `Trial — ${trialDaysLeft}d left`
                    : "Trial active"
                  : status?.status === "active"
                  ? "Active"
                  : status?.status === "paused"
                  ? "Paused"
                  : statusInfo.label}
              </span>
            </div>
          )}

          {/* ── Your next step — one clear action, adaptive ─────────── */}
          {hasActiveSub && !isLoading && (() => {
            let step;
            if (!discordStatus?.connected) {
              step = { label: "Your next step", title: "Connect your Discord", desc: "Link Discord to unlock your VIP role and start receiving live signals.", cta: "Connect Discord", onClick: handleConnectDiscord, href: undefined };
            } else if (gsCompleted < GS_TOTAL) {
              step = { label: "Your next step", title: "Finish Getting Started", desc: `${gsCompleted}/${GS_TOTAL} modules done — a 12-minute walkthrough of signals, sizing, and your first week.`, cta: "Continue", onClick: () => setLocation(`${basePath}/getting-started`), href: undefined };
            } else {
              step = { label: "You're all set", title: "Follow today's setups", desc: "Open Discord, read the morning breakdown, and trade the live signals as they trigger.", cta: "Open Discord", onClick: undefined, href: "https://discord.gg/bitcoindailyvip" };
            }
            return (
              <div className="mt-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">{step.label}</p>
                  <p className="font-bold text-lg leading-tight">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                </div>
                {step.href ? (
                  <a href={step.href} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button className="font-bold shadow-[0_0_20px_rgba(247,147,26,0.25)]">{step.cta} <ChevronRight className="ml-1.5 h-4 w-4" /></Button>
                  </a>
                ) : (
                  <Button onClick={step.onClick} disabled={step.cta === "Connect Discord" && discordLinking} className="shrink-0 font-bold shadow-[0_0_20px_rgba(247,147,26,0.25)]">
                    {step.cta === "Connect Discord" && discordLinking ? "Redirecting…" : step.cta} <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })()}
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-16 rounded-xl bg-card/50 border border-border/30" />
            <div className="h-28 rounded-xl bg-card/50 border border-border/30" />
            <div className="rounded-xl bg-card/50 border border-border/30 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted/60 rounded" />
                </div>
                <div className="h-4 w-16 bg-muted/60 rounded" />
              </div>
              <div className="h-3 w-48 bg-muted/40 rounded" />
              <div className="flex gap-3 pt-1">
                <div className="h-9 w-28 bg-muted/40 rounded-md" />
                <div className="h-9 w-36 bg-muted/30 rounded-md" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Welcome banner — shown once after checkout ───────────────── */}
            {showWelcome && (
              <Card className="border-emerald-500/40 bg-emerald-500/8 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
                <CardContent className="py-4 px-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-400">
                        {user?.firstName ? `Welcome to Bitcoin Daily VIP, ${user.firstName}!` : "Welcome to Bitcoin Daily VIP!"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Your trial is active. Connect your Discord account to get your VIP role and start receiving live signals.
                      </p>
                      {!discordStatus?.connected && (
                        <Button
                          size="sm"
                          className="mt-3 bg-[#5865F2] hover:bg-[#4752c4] text-white border-0 text-xs h-8 px-4"
                          disabled={discordLinking}
                          onClick={handleConnectDiscord}
                        >
                          <svg width="13" height="10" viewBox="0 0 127.14 96.36" fill="white" className="mr-1.5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                          </svg>
                          {discordLinking ? "Redirecting…" : "Connect Discord"}
                        </Button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-lg leading-none mt-0.5"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </CardContent>
              </Card>
            )}

            {/* ── Announcements — dismissable (members only) ───────────────── */}
            {hasActiveSub && ANNOUNCEMENTS.filter((a) => !dismissedAnnouncements.has(a.id)).map((a) => (
              <Card key={a.id} className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 flex gap-3 items-start">
                  <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-primary font-medium mb-0.5">{a.date}</p>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.body}</p>
                  </div>
                  <button
                    onClick={() => dismissAnnouncement(a.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none shrink-0 mt-0.5"
                    aria-label="Dismiss announcement"
                  >×</button>
                </CardContent>
              </Card>
            ))}

            {/* ── Trial countdown + tips ────────────────────────────────────── */}
            {status?.status === "trialing" && (() => {
              const totalDays = 7;
              const daysLeft = trialCountdown?.d ?? trialDaysLeft ?? totalDays;
              const elapsed = totalDays - daysLeft;
              const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
              const urgent = daysLeft === 0;
              const warning = daysLeft <= 2;
              const accentColor = urgent ? "red" : warning ? "amber" : "blue";
              const colorMap = {
                red:   { border: "border-red-500/40",   bg: "bg-red-500/8",   glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]",   ring: "bg-red-500/20 border-red-500/30",    text: "text-red-400",   bar: "bg-red-500",   pill: "bg-red-500/20 text-red-400 border-red-500/30" },
                amber: { border: "border-amber-500/40", bg: "bg-amber-500/8", glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]", ring: "bg-amber-500/20 border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500", pill: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                blue:  { border: "border-blue-500/40",  bg: "bg-blue-500/8",  glow: "shadow-[0_0_30px_rgba(59,130,246,0.12)]",  ring: "bg-blue-500/20 border-blue-500/30",   text: "text-blue-400",  bar: "bg-blue-500",  pill: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
              };
              const c = colorMap[accentColor];
              const pad = (n: number) => String(n).padStart(2, "0");
              return (
                <Card className={`${c.border} ${c.bg} ${c.glow} overflow-hidden relative`}>
                  <div className={`absolute top-0 inset-x-0 h-0.5 ${c.bar}`} />
                  <CardContent className="py-5 px-5 sm:px-6 space-y-5">

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl ${c.ring} border flex items-center justify-center shrink-0`}>
                          <Timer className={`h-4 w-4 ${c.text}`} />
                        </div>
                        <div>
                          <p className={`font-bold text-base ${c.text}`}>
                            {urgent ? "Your trial ends today!" : warning ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial` : "7-day free trial active"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formattedPeriodEnd ? `Trial ends ${formattedPeriodEnd}` : "No charge until the trial ends — cancel anytime."}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${c.pill} shrink-0`}>
                        Free Trial
                      </span>
                    </div>

                    {/* Live countdown tiles — only shown once ticker has started */}
                    {trialCountdown && (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Days",    value: trialCountdown.d },
                            { label: "Hours",   value: trialCountdown.h },
                            { label: "Minutes", value: trialCountdown.m },
                            { label: "Seconds", value: trialCountdown.s },
                          ].map(({ label, value }) => (
                            <div key={label} className="rounded-xl bg-background/50 border border-border/60 flex flex-col items-center py-3">
                              <span className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${c.text}`}>
                                {pad(value)}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Trial started</span>
                            <span>{pct}% elapsed</span>
                            <span>Trial ends</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border/60 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${c.bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Tips grid */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Make the most of your trial</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          {
                            icon: <MessageSquare className="h-3.5 w-3.5" />,
                            tip: "Connect Discord",
                            desc: "Live signals & morning analysis are posted there — this is step #1.",
                            done: !!discordStatus?.connected,
                            onClick: () => { window.location.href = "/api/discord/oauth/redirect"; },
                          },
                          {
                            icon: <GraduationCap className="h-3.5 w-3.5" />,
                            tip: "Complete Getting Started",
                            desc: "5 modules covering signals, risk sizing, and your first week action plan.",
                            done: gsCompleted >= GS_TOTAL,
                            onClick: () => setLocation(`${basePath}/getting-started`),
                          },
                          {
                            icon: <TrendingUp className="h-3.5 w-3.5" />,
                            tip: "Follow a live signal",
                            desc: "Watch one trade from entry to exit — see exactly how the process works.",
                            done: false,
                            onClick: () => setLocation(`${basePath}/getting-started?module=signals`),
                          },
                          {
                            icon: <CalendarClock className="h-3.5 w-3.5" />,
                            tip: "Set a reminder",
                            desc: formattedPeriodEnd ? `Add a calendar event for ${formattedPeriodEnd} so you never get surprised.` : "Add a calendar event for your trial end date so you're never surprised.",
                            done: false,
                            onClick: null,
                          },
                          {
                            icon: <BarChart2 className="h-3.5 w-3.5" />,
                            tip: "Review the trade history",
                            desc: "Check the live win rate, average return, and hot streak in the stats section below.",
                            done: false,
                            onClick: () => window.open("https://tradrx.io/shared/DAD01529995B", "_blank"),
                          },
                          {
                            icon: <Shield className="h-3.5 w-3.5" />,
                            tip: "No charge until trial ends",
                            desc: "You won't be billed until the trial expires. Cancel any time — no questions asked.",
                            done: false,
                            onClick: null,
                          },
                        ].map(({ icon, tip, desc, done, onClick }) => (
                          <div
                            key={tip}
                            onClick={onClick ?? undefined}
                            className={`rounded-lg border px-3.5 py-3 flex items-start gap-2.5 transition-colors ${done ? "border-emerald-500/25 bg-emerald-500/5" : "border-border/50 bg-background/30"} ${onClick ? "cursor-pointer hover:border-primary/40 hover:bg-primary/5" : ""}`}
                          >
                            <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${done ? "bg-emerald-500/20 text-emerald-400" : `${c.ring} border ${c.text}`}`}>
                              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold ${done ? "text-emerald-400" : "text-foreground"}`}>
                                {tip}{done ? " ✓" : ""}
                                {onClick && !done && <span className="ml-1 text-muted-foreground font-normal">→</span>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Discord action banner — active sub, not yet connected ────── */}
            {hasActiveSub && !discordStatus?.connected && (
              <Card className="border-[#5865F2]/40 bg-[#5865F2]/5 shadow-[0_0_20px_rgba(88,101,242,0.08)]">
                <CardContent className="py-5 px-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center shrink-0">
                      <svg width="18" height="14" viewBox="0 0 127.14 96.36" fill="#5865F2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-base">Connect Discord to access your signals</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Your membership is active — you need to link your Discord account to get your VIP role and start receiving live signals.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        step: "1",
                        label: "Click Connect below",
                        desc: "Hit the button below — you'll be sent to Discord to authorise the connection in seconds.",
                        extra: (
                          <Button
                            size="sm"
                            className="mt-2 bg-[#5865F2] hover:bg-[#4752c4] text-white border-0 text-xs h-8 px-4"
                            disabled={discordLinking}
                            onClick={handleConnectDiscord}
                          >
                            <svg width="13" height="10" viewBox="0 0 127.14 96.36" fill="white" className="mr-1.5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                            </svg>
                            {discordLinking ? "Redirecting…" : "Connect Discord"}
                          </Button>
                        ),
                      },
                      {
                        step: "2",
                        label: "Authorise in Discord",
                        desc: "Discord will ask you to confirm — click Authorise. Takes about 5 seconds.",
                        extra: null,
                      },
                      {
                        step: "3",
                        label: "VIP role assigned",
                        desc: "Your VIP role is granted automatically. Signals start flowing straight away.",
                        extra: null,
                      },
                    ].map(({ step, label, desc, extra }) => (
                      <div key={step} className="rounded-lg border border-[#5865F2]/20 bg-background/40 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-5 w-5 rounded-full bg-[#5865F2]/25 text-[#5865F2] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {step}
                          </span>
                          <p className="text-sm font-semibold">{label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                        {extra}
                      </div>
                    ))}
                  </div>

                  <Button
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-white border-0"
                    disabled={discordLinking}
                    onClick={handleConnectDiscord}
                  >
                    <svg width="16" height="12" viewBox="0 0 127.14 96.36" fill="white" className="mr-2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                    {discordLinking ? "Redirecting to Discord…" : "Connect Discord Account"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Member Journey tracker ───────────────────────────────────── */}
            {hasActiveSub && (() => {
              const guidesDone = gsCompleted >= GS_TOTAL;
              const discordDone = !!discordStatus?.connected;
              const allDone = guidesDone && discordDone;
              const doneCount = [guidesDone, discordDone].filter(Boolean).length;

              if (allDone) {
                return (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="py-4 px-6 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-emerald-400">Journey complete!</p>
                        <p className="text-xs text-muted-foreground">You've completed both steps — you're all set.</p>
                      </div>
                      <button
                        onClick={() => setLocation(`${basePath}/getting-started`)}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        Review guides →
                      </button>
                    </CardContent>
                  </Card>
                );
              }

              const steps = [
                {
                  id: "guides",
                  done: guidesDone,
                  icon: <GraduationCap className="h-4 w-4" />,
                  title: "Complete the Getting Started guides",
                  desc: guidesDone
                    ? "All 5 modules complete"
                    : gsCompleted > 0
                    ? `${gsCompleted} of ${GS_TOTAL} modules done`
                    : "5 short modules — signals, risk sizing, and your action plan",
                  action: (
                    <Button
                      size="sm"
                      variant={guidesDone ? "ghost" : "outline"}
                      className={guidesDone ? "text-muted-foreground text-xs" : "text-xs border-primary/40 text-primary hover:bg-primary/10"}
                      onClick={() => setLocation(`${basePath}/getting-started`)}
                    >
                      {guidesDone ? "Review →" : gsCompleted > 0 ? "Continue →" : "Start →"}
                    </Button>
                  ),
                },
                {
                  id: "discord",
                  done: discordDone,
                  icon: <MessageSquare className="h-4 w-4" />,
                  title: "Connect your Discord account",
                  desc: discordDone
                    ? `Connected as ${discordStatus?.discordUsername ?? "Discord"}`
                    : "Live signals & morning analysis are posted in the VIP channel",
                  action: !discordDone ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-primary/40 text-primary hover:bg-primary/10"
                      disabled={discordLinking}
                      onClick={() => {
                        setDiscordLinking(true);
                        window.location.href = "/api/discord/oauth/redirect";
                      }}
                    >
                      {discordLinking ? "Redirecting…" : "Connect →"}
                    </Button>
                  ) : null,
                },
              ];

              return (
                <Card className="border-border/50 bg-card/50 overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/60 via-amber-400/40 to-transparent" />
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-base">Your Member Journey</CardTitle>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        {doneCount} / 2 complete
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full transition-all duration-700"
                        style={{ width: `${(doneCount / 2) * 100}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5 space-y-0">
                    {steps.map((step, i) => (
                      <div
                        key={step.id}
                        className={`flex items-start gap-4 py-3.5 ${i < steps.length - 1 ? "border-b border-border/40" : ""}`}
                      >
                        {/* Step indicator */}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          step.done
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            : "bg-primary/10 border border-primary/20 text-primary"
                        }`}>
                          {step.done ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${step.done ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                        </div>
                        {/* Action */}
                        {step.action && <div className="shrink-0 self-center">{step.action}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Quick Links — members only ───────────────────────────────── */}
            {hasActiveSub && (
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base">Quick Links</CardTitle>
                <CardDescription>Discord is where all live signals and analysis are posted</CardDescription>
              </CardHeader>
              <CardContent className="pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://discord.gg/bitcoindailyvip"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium">Discord Server</p>
                    <p className="text-xs text-muted-foreground">Live signals & analysis</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="https://tradrx.io/shared/DAD01529995B"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <BarChart2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Live Journal</p>
                    <p className="text-xs text-muted-foreground">Every trade, verified</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <button
                  onClick={() => setLocation(`${basePath}/resources`)}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group text-left"
                >
                  <BookOpen className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Member Resources</p>
                    <p className="text-xs text-muted-foreground">Guides, frameworks & playbooks</p>
                  </div>
                </button>
              </CardContent>
            </Card>
            )}

            {/* ── Never miss a signal — notification setup ─────────────────── */}
            {hasActiveSub && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Never miss a signal</CardTitle>
                  </div>
                  <CardDescription>Signals are time-sensitive — set this up once so an alert reaches you the moment a setup triggers.</CardDescription>
                </CardHeader>
                <CardContent className="pb-5 space-y-3">
                  {[
                    { n: 1, t: "Turn on Discord mobile push", d: "Install the Discord app and allow notifications. In the server, tap the bell → \"All Messages\" for the signals channel." },
                    { n: 2, t: "Star the #signals channel", d: "So it's always one tap away — no scrolling to find the latest setup." },
                    { n: 3, t: "(Optional) Desktop alerts", d: "Keep Discord open on desktop during your trading hours for instant pop-ups." },
                  ].map((s) => (
                    <div key={s.n} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.n}</div>
                      <div>
                        <p className="text-sm font-medium">{s.t}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                      </div>
                    </div>
                  ))}
                  <a
                    href="https://discord.gg/bitcoindailyvip"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline pt-1"
                  >
                    Open Discord to set it up <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* ── My results — personal trade journal ──────────────────────── */}
            {hasActiveSub && <TradeLogger />}

            {/* ── Leave a review (only once qualified) → 25% off next month ── */}
            {hasActiveSub && <ReviewPrompt />}

            {/* ── Subscription section — gated by hasActiveSub ─────────────── */}
            {!hasActiveSub ? (
              /* No subscription — sales page */
              <div className="space-y-5">

                {/* ── Hero ── */}
                <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-7 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    VIP Membership
                  </div>
                  <h2 className="text-2xl font-bold leading-snug">
                    {user?.firstName
                      ? `${user.firstName}, your edge is one step away.`
                      : "Your edge is one step away."}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Real-time Bitcoin trade signals, daily market analysis, and a private VIP Discord — everything verified, nothing hidden.
                  </p>
                </div>

                {/* ── Hot streak banner ── */}
                {recentStats && (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                      <div className="shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">🔥</span>
                          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Recent Performance</span>
                        </div>
                        <p className="text-xl font-extrabold tracking-tight text-white">On a heater right now.</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Last {recentStats.tradeCount} trades</p>
                      </div>
                      <div className="hidden sm:block w-px self-stretch bg-emerald-500/20" />
                      <div className="flex flex-wrap gap-6 flex-1">
                        <div>
                          <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">{recentStats.winRate}%</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Win Rate</p>
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold tracking-tight">
                            <span className="text-emerald-400">{recentStats.wins}W</span>
                            <span className="text-muted-foreground mx-1 text-xl">/</span>
                            <span className="text-red-400">{recentStats.losses}L</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">Wins / Losses</p>
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold text-emerald-400 tracking-tight">+${Math.round(recentStats.pl).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">P&L</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Stat cards ── */}
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                >
                  {[
                    { val: liveStats ? `${liveStats.winRate}%` : "70%", label: "Win Rate", sub: "Verified live trades", primary: true },
                    { val: liveStats ? `${liveStats.avgMonthlyReturnMin}–${liveStats.avgMonthlyReturnMax}%` : "5–10%", label: "Avg Monthly", sub: "Per month on avg", primary: false },
                    { val: liveStats ? `~${liveStats.tradesPerMonth}` : "~20", label: "Signals/Month", sub: "Active setups posted", primary: false },
                    { val: liveStats ? `${liveStats.bestStreak}W` : "12W", label: "Best Streak", sub: "Wins in a row", primary: false },
                    { val: liveStats ? `${liveStats.profitFactor}` : "2.3", label: "Profit Factor", sub: "Gross wins ÷ losses", primary: false },
                    { val: "7-Day", label: "Free Trial", sub: "No charge until it ends", primary: false },
                  ].map(({ val, label, sub, primary }) => (
                    <motion.div
                      key={label}
                      variants={fadeInUp}
                      className={`rounded-xl border p-4 text-center ${primary ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(247,147,26,0.12)]" : "border-border/50 bg-card/50"}`}
                    >
                      <p className={`text-2xl font-extrabold tracking-tight ${primary ? "text-primary" : "text-foreground"}`}>{val}</p>
                      <p className="text-xs font-semibold text-foreground mt-1">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* ── Instrument breakdown ── */}
                {liveStats?.instruments?.length ? (
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Performance by instrument</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {liveStats.instruments.map((inst) => (
                        <div key={inst.ticker} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-4 py-3">
                          <div>
                            <span className="text-sm font-bold text-primary">{inst.ticker}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {inst.ticker === "BTC" ? "Primary focus" : inst.ticker === "ETH" ? "Alt momentum" : "High beta plays"}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-emerald-400">{inst.winRate}% WR</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">All trades published live. Fully verified at TradrX.io — nothing hidden or back-tested.</p>
                  </div>
                ) : null}

                {/* ── What's included ── */}
                <Card className="border-border/50 bg-card/30">
                  <CardContent className="py-5 space-y-2.5">
                    <p className="font-semibold text-sm mb-1">What's included with VIP</p>
                    {[
                      "Live trade signals — entry, stop-loss & take-profit posted the moment setups trigger",
                      "Morning market analysis every trading day in the VIP Discord",
                      "Risk management framework — position sizing, drawdown rules & mindset guides",
                      "Full trade journal access — every trade publicly verified on TradRx",
                      "Private VIP Discord community with fellow serious traders",
                      "7-day free trial — no charge until the trial ends, cancel anytime",
                    ].map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <span className="text-primary shrink-0 mt-0.5">✓</span>
                        <p className="text-sm text-muted-foreground">{f}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ── Testimonials ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: "Marcus T.", result: "Up 42% in his first 90 days", text: "I've been in 5 different 'premium' groups. This is the only one where the setups actually hit. The risk framework alone saved me from a liquidation cascade.", avatarBg: "bg-blue-500/20 border-blue-500/30", avatarText: "text-blue-400" },
                    { name: "Sarah K.", result: "Now trading full-time", text: "The morning Discord analysis is my edge. It cuts through all the noise — I read the breakdown, understand the math, and execute.", avatarBg: "bg-purple-500/20 border-purple-500/30", avatarText: "text-purple-400" },
                  ].map(({ name, result, text, avatarBg, avatarText }) => (
                    <div key={name} className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-2">
                      <div className="flex gap-0.5 mb-1" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} className="h-3 w-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        ))}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${avatarBg} ${avatarText}`}>
                          {name.charAt(0)}
                        </div>
                        <p className="text-xs font-semibold text-primary">{result}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">"{text}"</p>
                      <p className="text-xs font-medium text-muted-foreground">— {name}</p>
                    </div>
                  ))}
                </div>

                {/* ── Live journal proof ── */}
                <a
                  href="https://tradrx.io/shared/DAD01529995B"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/30 px-5 py-3.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BarChart2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">View the live trade journal</p>
                      <p className="text-xs text-muted-foreground">Every trade, publicly verified on TradRx</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>

                {/* ── Plan selector ── */}
                <Card className="border-primary/30 bg-card/50 shadow-[0_0_30px_rgba(247,147,26,0.07)]">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Start your 7-day free trial</CardTitle>
                    <CardDescription>
                      No charge until the trial ends. Cancel anytime from the portal.
                    </CardDescription>
                    <p className="text-xs text-muted-foreground/70 pt-1">
                      You can update or change your payment method anytime from this portal after checkout.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Billing toggle */}
                    <div className="flex rounded-lg border border-border/50 p-1 gap-1 bg-muted/30">
                      {(["monthly", "yearly"] as const).map((b) => (
                        <button
                          key={b}
                          onClick={() => setBilling(b)}
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            billing === b
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {b === "monthly" ? "Monthly" : "Yearly"}
                          {b === "yearly" && (
                            <span className="ml-1.5 text-[10px] font-semibold opacity-80">Save 17%</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {billing === "yearly" && (
                      <p className="text-xs text-primary/80 text-center -mt-1">2 months free · billed annually</p>
                    )}

                    {/* Plan selector — VIP + VIP Premium */}
                    <div className="space-y-2">
                      {([
                        {
                          id: "vip" as const,
                          label: "VIP",
                          price: billing === "yearly" ? "$82" : "$99",
                          sub: billing === "yearly" ? "$990/year · Cancel anytime" : "Billed monthly · Cancel anytime",
                        },
                        {
                          id: "premium" as const,
                          label: "VIP Premium",
                          price: billing === "yearly" ? "$166" : "$199",
                          sub: billing === "yearly" ? "$1,990/year" : "Billed monthly",
                        },
                      ]).map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => setPlanType(plan.id)}
                          className={`w-full text-left rounded-lg border p-3.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                            planType === plan.id
                              ? plan.id === "premium"
                                ? "border-amber-500/60 bg-amber-500/8"
                                : "border-primary bg-primary/10"
                              : "border-border/50 hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                                planType === plan.id
                                  ? plan.id === "premium" ? "border-amber-400 bg-amber-400" : "border-primary bg-primary"
                                  : "border-muted-foreground"
                              }`} />
                              <div>
                                <p className="text-sm font-semibold flex items-center gap-2">
                                  {plan.label}
                                  {plan.id === "premium" && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Premium</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">{plan.sub}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-bold">{plan.price}</span>
                              <span className="text-xs text-muted-foreground">/mo</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {planType === "premium" && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                        <p className="font-medium text-amber-400 text-xs">What's included in Premium</p>
                        {["Private 1-on-1 Discord channel with Bitcoin Jae", "Personalized trade reviews & portfolio feedback", "Direct Q&A — ask anything, get direct answers", "Everything in VIP"].map((f) => (
                          <p key={f} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="text-amber-400 shrink-0">✓</span>{f}</p>
                        ))}
                      </div>
                    )}

                    {/* Promo code */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Promo code (optional)"
                          aria-label="Promo code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="w-full h-9 rounded-md border border-border/60 bg-card/30 px-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition font-mono tracking-wider"
                        />
                        {couponCode.trim() && (
                          <button
                            type="button"
                            onClick={() => setCouponCode("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                            aria-label="Clear promo code"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {couponCode.trim() && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1">
                          <span>✓</span> Code <span className="font-mono font-semibold">{couponCode.trim()}</span> will be applied at checkout
                        </p>
                      )}
                    </div>

                    <Button
                      className={`w-full font-semibold transition-all ${
                        planType === "premium"
                          ? "bg-amber-500 hover:bg-amber-600 text-black"
                          : "shadow-[0_0_20px_rgba(247,147,26,0.3)] hover:shadow-[0_0_30px_rgba(247,147,26,0.5)]"
                      }`}
                      size="lg"
                      disabled={checkoutMutation.isPending}
                      onClick={() => requestCheckout(selectedPlan, couponCode.trim() || undefined)}
                    >
                      {checkoutMutation.isPending
                        ? "Redirecting to checkout…"
                        : planType === "premium"
                        ? "Get Premium Access"
                        : "Start 7-Day Free Trial"}
                    </Button>
                    {checkoutMutation.isError && (
                      <p className="text-sm text-destructive text-center">
                        {checkoutMutation.error instanceof Error
                          ? checkoutMutation.error.message
                          : "Something went wrong. Please try again."}
                      </p>
                    )}
                  </CardContent>
                </Card>

              </div>
            ) : (
              /* Active subscription management */
              <>
                <Card className="border-border/50 bg-card/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Your plan</p>
                        <CardTitle className="text-xl">
                          {planInfo.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {planInfo.price}
                        </CardDescription>
                        {formattedPeriodEnd && !status?.cancelAtPeriodEnd && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {status?.status === "trialing" ? "Trial ends" : "Next billing"}{" "}
                            <span className="text-foreground font-medium">{formattedPeriodEnd}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-sm font-semibold ${statusInfo.color}`}>
                          ● {statusInfo.label}
                        </span>
                        {trialDaysLeft !== null && (
                          <span className="text-xs text-primary/80 font-medium">
                            {trialDaysLeft === 0 ? "Trial ends today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
                          </span>
                        )}
                        {status?.cancelAtPeriodEnd && (
                          <span className="text-xs text-amber-400">
                            Cancels {formattedPeriodEnd}
                          </span>
                        )}
                        {!status?.cancelAtPeriodEnd && (() => {
                          const sc = (status as unknown as { scheduledPlanChange?: { planTier: string | null; date: string } | null })?.scheduledPlanChange;
                          if (!sc?.planTier || !sc.date) return null;
                          const scPlan = PLAN_INFO[sc.planTier] ?? null;
                          const scDate = new Date(sc.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                          return (
                            <span className="text-xs text-muted-foreground">
                              Switches to {scPlan?.name ?? sc.planTier} on {scDate}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {status?.status === "past_due" && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-destructive">Payment failed</p>
                          <p className="text-destructive/80 mt-0.5">Your last payment didn't go through. Update your payment method to keep your access uninterrupted.</p>
                          <button
                            className="mt-2 text-xs font-semibold text-destructive underline hover:no-underline"
                            disabled={portalMutation.isPending}
                            onClick={() => portalMutation.mutate(undefined)}
                          >
                            {portalMutation.isPending ? "Loading…" : "Update payment method →"}
                          </button>
                        </div>
                      </div>
                    )}

                    {status?.paused && (
                      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
                        Your billing is currently paused.
                        {formattedResumeDate
                          ? ` Billing resumes on ${formattedResumeDate}.`
                          : " Resume anytime to continue your membership."}
                      </div>
                    )}

                    {status?.cancelAtPeriodEnd && (
                      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-300">
                        Your membership is scheduled to cancel on{" "}
                        {formattedPeriodEnd}. You'll retain access until then.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-1">
                      {status?.cancelAtPeriodEnd ? (
                        <Button
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60"
                          disabled={reactivateMutation.isPending}
                          onClick={() => reactivateMutation.mutate(undefined)}
                        >
                          {reactivateMutation.isPending ? "Reactivating…" : "Undo Cancellation"}
                        </Button>
                      ) : status?.paused ? (
                        <Button
                          variant="outline"
                          disabled={resumeMutation.isPending}
                          onClick={() => resumeMutation.mutate(undefined)}
                        >
                          {resumeMutation.isPending ? "Resuming…" : "Resume Billing"}
                        </Button>
                      ) : status?.status !== "trialing" ? (
                        <Button
                          variant="outline"
                          disabled={pauseMutation.isPending}
                          onClick={() => pauseMutation.mutate(undefined)}
                        >
                          {pauseMutation.isPending ? "Pausing…" : "Pause Billing"}
                        </Button>
                      ) : null}

                      {!status?.cancelAtPeriodEnd && (
                        <Button
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={openCancelModal}
                        >
                          Cancel Membership
                        </Button>
                      )}

                    </div>
                    {/* ── Change Plan — inlined below the buttons ──────────── */}
                    {!status?.cancelAtPeriodEnd && (() => {
                      const ALL_PLANS = [
                        { key: "monthly",        name: "VIP",                price: "$99",  period: "/mo",  annualNote: null,                              isPremium: false, tierRank: 1, isAnnual: false },
                        { key: "yearly",         name: "VIP Yearly",         price: "$82",  period: "/mo",  annualNote: "$990 billed annually · save $198",  isPremium: false, tierRank: 1, isAnnual: true  },
                        { key: "premium",        name: "VIP Premium",        price: "$199", period: "/mo",  annualNote: null,                              isPremium: true,  tierRank: 2, isAnnual: false },
                        { key: "premium-yearly", name: "VIP Premium Yearly", price: "$166", period: "/mo",  annualNote: "$1,990 billed annually · save $398", isPremium: true,  tierRank: 2, isAnnual: true  },
                      ];
                      const currentKey = normalisedPlanTier ?? "monthly";
                      const current = ALL_PLANS.find((p) => p.key === currentKey) ?? ALL_PLANS[0];

                      function getPlanBadge(plan: typeof ALL_PLANS[0]) {
                        if (plan.tierRank > current.tierRank)
                          return { label: "Upgrade", cls: plan.isPremium ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
                        if (plan.tierRank < current.tierRank)
                          return { label: "Downgrade", cls: "bg-muted text-muted-foreground border-border/50" };
                        if (plan.isAnnual && !current.isAnnual)
                          return { label: plan.isPremium ? "Save $398/yr" : "Save $198/yr", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
                        return { label: "Monthly", cls: "bg-muted text-muted-foreground border-border/50" };
                      }

                      return (
                        <div className="border-t border-border/40 pt-4 -mx-6 px-6">
                          <button
                            className="w-full flex items-center justify-between gap-3 text-left"
                            onClick={() => { setShowChangePlan((v) => !v); setPendingPlanType(null); changePlanMutation.reset(); }}
                          >
                            <div>
                              <p className="font-semibold text-sm">Change Plan</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Upgrade, downgrade, or switch to annual billing</p>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${showChangePlan ? "rotate-90" : ""}`} />
                          </button>

                          {showChangePlan && (
                            <div className="mt-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {ALL_PLANS.map((plan) => {
                                  const isCurrent = plan.key === currentKey;
                                  const selected = pendingPlanType === plan.key;
                                  const badge = isCurrent ? null : getPlanBadge(plan);
                                  return (
                                    <button
                                      key={plan.key}
                                      disabled={isCurrent}
                                      onClick={() => !isCurrent && setPendingPlanType(selected ? null : plan.key)}
                                      className={`rounded-xl border px-4 py-3 text-left transition-all ${
                                        isCurrent
                                          ? plan.isPremium ? "border-amber-500/40 bg-amber-500/8 cursor-default" : "border-primary/40 bg-primary/8 cursor-default"
                                          : selected
                                          ? plan.isPremium ? "border-amber-500/60 bg-amber-500/10" : "border-primary/60 bg-primary/10"
                                          : "border-border/60 bg-background/30 hover:border-border"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-semibold text-sm ${isCurrent ? (plan.isPremium ? "text-amber-400" : "text-primary") : ""}`}>
                                              {plan.name}
                                            </span>
                                            {isCurrent ? (
                                              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${plan.isPremium ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-primary/20 text-primary border-primary/30"}`}>
                                                Current plan
                                              </span>
                                            ) : badge ? (
                                              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${badge.cls}`}>
                                                {badge.label}
                                              </span>
                                            ) : null}
                                          </div>
                                          {plan.annualNote && <p className="text-[11px] text-muted-foreground mt-0.5">{plan.annualNote}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={`font-bold text-base ${isCurrent ? (plan.isPremium ? "text-amber-400" : "text-primary") : ""}`}>{plan.price}</span>
                                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                                        </div>
                                      </div>
                                      {plan.isPremium && (
                                        <p className={`text-[11px] mt-1.5 ${isCurrent ? "text-amber-400/60" : "text-amber-400/80"}`}>
                                          + Private 1-on-1 channel · Trade reviews · Direct Q&amp;A
                                        </p>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {pendingPlanType && (() => {
                                const chosen = ALL_PLANS.find((p) => p.key === pendingPlanType)!;
                                const isTrial = status?.status === "trialing";
                                return (
                                  <div className="rounded-xl border border-border/50 bg-background/40 px-4 py-3 space-y-3">
                                    <div className="text-sm">
                                      <p className="font-semibold">Switch to {chosen.name}?</p>
                                      <p className="text-muted-foreground text-xs mt-1">
                                        {isTrial ? "Your trial continues on the new plan — no charge until it ends." : "Stripe will prorate the difference and apply it to your next invoice."}
                                      </p>
                                    </div>
                                    {changePlanMutation.isError && (
                                      <p className="text-xs text-destructive">
                                        {changePlanMutation.error instanceof Error ? changePlanMutation.error.message : "Something went wrong. Please try again."}
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className={chosen.isPremium ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
                                        disabled={changePlanMutation.isPending}
                                        onClick={() => changePlanMutation.mutate({ data: { priceType: pendingPlanType as "monthly" | "yearly" | "premium" | "premium-yearly" } })}
                                      >
                                        {changePlanMutation.isPending ? "Switching…" : `Confirm switch to ${chosen.name}`}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setPendingPlanType(null); changePlanMutation.reset(); }}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Payment Method ──────────────────────────────────── */}
                    <div className="border-t border-border/40 pt-4 -mx-6 px-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">Payment Method</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Update your card or view past invoices</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          disabled={portalMutation.isPending}
                          onClick={() => portalMutation.mutate(undefined)}
                        >
                          {portalMutation.isPending ? "Loading…" : "Manage →"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Discord connection card */}
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="py-5 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="#5865F2" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                          </svg>
                          Discord VIP Access
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {discordStatus?.connected
                            ? `Connected as @${discordStatus.username ?? discordStatus.discordUserId}`
                            : "All live signals are posted in Discord — connect to get your VIP role"}
                        </p>
                      </div>

                      {discordStatus?.connected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          disabled={disconnectMutation.isPending}
                          onClick={() => disconnectMutation.mutate(undefined)}
                        >
                          {disconnectMutation.isPending ? "Unlinking…" : "Unlink"}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10 hover:text-[#5865F2]"
                          disabled={discordLinking}
                          onClick={handleConnectDiscord}
                        >
                          {discordLinking ? "Redirecting…" : "Connect Discord"}
                        </Button>
                      )}
                    </div>

                    {discordNotice === "connected" && (
                      <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">
                        Discord connected! Your VIP role will be assigned automatically.
                      </div>
                    )}
                    {discordNotice === "error" && (
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        Could not link Discord. Please try again or contact support.
                      </div>
                    )}

                    {!discordStatus?.connected && (
                      <p className="text-xs text-muted-foreground">
                        New to Discord?{" "}
                        <a
                          href="https://discord.gg/bitcoindailyvip"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Join the server first
                        </a>
                        {" "}— then come back here to link your account and get your VIP role automatically.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Contact / Support — always visible ──────────────────────── */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Need help?</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Chat with our AI or open a ticket — we respond fast.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSupportStep("faq"); }}
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    FAQs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    onClick={openChat}
                  >
                    <Bot className="w-3.5 h-3.5 mr-1.5" />
                    Chat with Us
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSupportStep("ticket")}>
                    Open a Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </main>

      {/* ── AI Support Chat Widget ─────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-5rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">AI Assistant</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bitcoin Daily VIP Support</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChatOpen(false)}
                aria-label="Minimize chat"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
            {chatLoading && chatMessages.length === 0 && (
              <div className="flex justify-center py-8">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-start">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 mt-0.5 shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted text-foreground px-3.5 py-2.5 text-sm leading-relaxed">
                    Hey{user?.firstName ? `, ${user.firstName}` : ""}! 👋 I'm your Bitcoin Daily VIP assistant. Ask me anything — billing, your plan, Discord access, signals, or anything else about your membership.
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground px-1">Quick questions:</p>
                <div className="flex flex-col gap-1.5">
                  {["How do I join Discord?", "How does billing work?", "What's included in my plan?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); chatInputRef.current?.focus(); }}
                      className="text-xs text-left px-3 py-2 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mr-1.5 mt-0.5 shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                  {msg.streaming && msg.content === "" && (
                    <span className="inline-flex gap-0.5 ml-0.5">
                      <span className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border p-3 bg-card/80 backdrop-blur-sm">
            <div className="flex gap-2 items-end">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Ask anything…"
                aria-label="Message the assistant"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 max-h-28 overflow-y-auto"
                style={{ minHeight: "38px" }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || chatLoading || !chatConvId}
                aria-label="Send message"
                className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
              AI can't always help —{" "}
              <button
                onClick={openSupport}
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                open a ticket
              </button>
              {" "}for account issues
            </p>
          </div>
        </div>
      )}

      {/* Floating chat button when widget is closed */}
      {!chatOpen && (
        <div className={`fixed bottom-4 right-4 z-50 ${chatBouncing && chatUnread ? "animate-bounce" : ""}`}>
          <button
            onClick={openChat}
            className="relative w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.25)] hover:bg-primary/90"
            title="Open AI Assistant"
            aria-label={chatUnread ? "Open AI assistant (1 unread message)" : "Open AI assistant"}
          >
            <Bot className="w-5 h-5" />
            {chatUnread && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-background">
                1
              </span>
            )}
          </button>
        </div>
      )}

      {/* Support Hub Modal */}
      {supportStep !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeSupport(); }}
        >
          <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                {supportStep !== "hub" && (
                  <button
                    onClick={() => setSupportStep(supportStep === "done" ? "hub" : supportStep === "ticket" ? "hub" : "hub")}
                    className="mr-1 p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <LifeBuoy className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">
                  {supportStep === "hub" && "Help Center"}
                  {supportStep === "faq" && "Frequently Asked Questions"}
                  {supportStep === "ticket" && "Open a Ticket"}
                  {supportStep === "done" && "Ticket Submitted"}
                </span>
              </div>
              <button onClick={closeSupport} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">

              {/* Step 1: Hub */}
              {supportStep === "hub" && (
                <div className="p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">How can we help you today?</p>
                  <button
                    onClick={() => setSupportStep("faq")}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <HelpCircle className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Browse FAQs</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quick answers to common questions</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                  <button
                    onClick={() => { closeSupport(); openChat(); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Chat with AI</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Get instant answers from our support bot</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                  <button
                    onClick={() => setSupportStep("ticket")}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Open a Ticket</p>
                      <p className="text-xs text-muted-foreground mt-0.5">We'll respond to your email within 24hrs</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                </div>
              )}

              {/* Step 2: FAQ */}
              {supportStep === "faq" && (
                <div className="p-5 space-y-2">
                  {SUPPORT_FAQS.map((faq) => (
                    <div key={faq.id} className="border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => setFaqOpenId(faqOpenId === faq.id ? null : faq.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-sm font-medium">{faq.q}</span>
                        {faqOpenId === faq.id
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        }
                      </button>
                      {faqOpenId === faq.id && (
                        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Still need help?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { closeSupport(); openChat(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
                      >
                        <Bot className="w-4 h-4 text-primary" /> Chat with AI
                      </button>
                      <button
                        onClick={() => setSupportStep("ticket")}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Open a Ticket
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Ticket Form */}
              {supportStep === "ticket" && (
                <form onSubmit={submitTicket} className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">Describe your issue and we'll follow up by email — usually within a few hours.</p>
                  <div className="space-y-1">
                    <label htmlFor="ticket-subject" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</label>
                    <input
                      id="ticket-subject"
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Billing issue, Discord access…"
                      required
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="ticket-message" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Message</label>
                    <textarea
                      id="ticket-message"
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe what's happening in as much detail as you can…"
                      required
                      rows={5}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  {ticketError && (
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{ticketError}</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setSupportStep("hub")}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={ticketSubmitting || !ticketSubject.trim() || !ticketMessage.trim()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ticketSubmitting ? "Sending…" : "Send Ticket"}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Done */}
              {supportStep === "done" && (
                <div className="p-5 space-y-5">
                  <div className="text-center space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Ticket submitted!</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We'll get back to you at your account email — usually within a few hours.
                      </p>
                    </div>
                  </div>
                  {openTickets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your open tickets</p>
                      {openTickets.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">#{t.id} — {t.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${t.status === "open" ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={closeSupport}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCancelModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            {cancelStep === "survey" && (
              <>
                <div>
                  <h2 className="text-xl font-bold">
                    Before you go…
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Help us improve by telling us why you're leaving.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Reason for cancelling
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  >
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeCancelModal}
                  >
                    Keep Membership
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    onClick={handleSurveyNext}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {cancelStep === "offer" && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Stay and save 20%</h2>
                  </div>
                  <button
                    onClick={closeCancelModal}
                    className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none shrink-0"
                    aria-label="Close"
                  >×</button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mt-1">
                    We'd like to offer you{" "}
                    <span className="text-primary font-semibold">
                      20% off your next 2 billing cycles
                    </span>{" "}
                    if you stay. That's only{" "}
                    <span className="text-foreground font-semibold">
                      ${discountedPrice}
                    </span>{" "}
                    instead of {planInfo.price.split("·")[0].trim()}.
                  </p>
                </div>
                <Button
                  className="w-full font-semibold shadow-[0_0_20px_rgba(247,147,26,0.3)]"
                  disabled={surveyMutation.isPending}
                  onClick={handleAcceptOffer}
                >
                  {surveyMutation.isPending
                    ? "Applying discount…"
                    : "Accept 20% Off — Stay"}
                </Button>
                <button
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  disabled={surveyMutation.isPending}
                  onClick={handleCancelAnyway}
                >
                  {surveyMutation.isPending
                    ? "Processing…"
                    : "No thanks, cancel my membership"}
                </button>
              </>
            )}

            {cancelStep === "done" && (
              <>
                <div className="text-center space-y-2 py-2">
                  <div className="text-4xl">
                    {offerMessage.includes("discount") ? "🎉" : "👋"}
                  </div>
                  <h2 className="text-xl font-bold">
                    {offerMessage.includes("discount")
                      ? "Discount Applied!"
                      : "Cancellation Scheduled"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {offerMessage}
                  </p>
                </div>
                <Button className="w-full" onClick={closeCancelModal}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
