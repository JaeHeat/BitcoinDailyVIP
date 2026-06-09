import { useEffect, useRef, lazy, Suspense } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, publishableKeyFromHost } from "@/lib/clerk-compat";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Portal from "@/pages/portal";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import AdminDiscord from "@/pages/admin-discord";
import Admin from "@/pages/admin";
import AdminMember from "@/pages/admin-member";
import NotFound from "@/pages/not-found";

const GettingStarted = lazy(() => import("@/pages/getting-started"));
const Resources = lazy(() => import("@/pages/resources"));
const Calculator = lazy(() => import("@/pages/calculator"));
const Exchanges = lazy(() => import("@/pages/exchanges"));
const PropFirms = lazy(() => import("@/pages/prop-firms"));
const Guides = lazy(() => import("@/pages/guides"));
const Mentorship = lazy(() => import("@/pages/mentorship"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.DEV
  ? undefined
  : import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#F7931A",
    colorForeground: "hsl(0, 0%, 95%)",
    colorMutedForeground: "hsl(215, 10%, 55%)",
    colorBackground: "hsl(220, 20%, 10%)",
    colorInput: "hsl(220, 15%, 22%)",
    colorInputForeground: "hsl(0, 0%, 95%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorNeutral: "hsl(220, 15%, 18%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "rounded-2xl w-[440px] max-w-full overflow-hidden border border-[hsl(220,15%,18%)] shadow-[0_0_30px_rgba(247,147,26,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-muted-foreground",
    footerActionLink: "text-primary",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-foreground",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border-border",
    formButtonPrimary: "bg-primary text-primary-foreground",
    formFieldInput: "bg-input text-foreground",
    footerAction: "border-t border-border",
    dividerLine: "bg-border",
    alert: "border-destructive/30 bg-destructive/10",
    otpCodeFieldInput: "bg-input text-foreground",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 gap-6">
      <a
        href={basePath || "/"}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <span className="text-lg font-bold text-primary">₿</span>
        <span className="font-semibold tracking-tight">Bitcoin Daily VIP</span>
      </a>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/portal?checkout=1`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to={`${basePath}/portal?checkout=1`} />
      </Show>
      <Show when="signed-out">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 gap-6">
          <a
            href={basePath || "/"}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <span className="text-lg font-bold text-primary">₿</span>
            <span className="font-semibold tracking-tight">Bitcoin Daily VIP</span>
          </a>
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            forceRedirectUrl={`${basePath}/portal?checkout=1`}
          />
          <p className="text-xs text-muted-foreground text-center -mt-2">
            7-day free trial &middot; Cancel before day 7 and pay nothing &middot; Secure checkout via Stripe
          </p>
        </div>
      </Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/portal" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function PortalRoute() {
  return (
    <>
      <Show when="signed-in">
        <Portal />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AdminDiscordRoute() {
  return (
    <>
      <Show when="signed-in">
        <AdminDiscord />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AdminRoute() {
  return (
    <>
      <Show when="signed-in">
        <Admin />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    // Don't fight in-page anchor links (e.g. /#pricing) — only reset on real route changes.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your Bitcoin Daily VIP member portal",
          },
        },
        signUp: {
          start: {
            title: "Join Bitcoin Daily VIP",
            subtitle: "Create your account and start trading with edge",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ScrollToTop />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/portal" component={PortalRoute} />
            <Route path="/getting-started" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><GettingStarted /></Suspense></Show>} />
            <Route path="/resources" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><Resources /></Suspense></Show>} />
            <Route path="/calculator" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><Calculator /></Suspense></Show>} />
            <Route path="/exchanges" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><Exchanges /></Suspense></Show>} />
            <Route path="/prop-firms" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><PropFirms /></Suspense></Show>} />
            <Route path="/guides" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><Guides /></Suspense></Show>} />
            <Route path="/mentorship" component={() => <Show when="signed-in" fallback={<Redirect to="/sign-in" />}><Suspense><Mentorship /></Suspense></Show>} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/admin" component={AdminRoute} />
            <Route path="/admin/discord" component={AdminDiscordRoute} />
            <Route path="/admin/member/:id" component={({ params }) => (
              <Show when="signed-in" fallback={<Redirect to="/" />}>
                <AdminMember id={Number(params.id)} />
              </Show>
            )} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
