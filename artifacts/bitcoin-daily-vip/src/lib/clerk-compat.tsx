/**
 * Clerk compatibility shim — DEV-ONLY AUTH BYPASS.
 *
 * By default this re-exports the real @clerk/react primitives unchanged, so
 * production builds are byte-for-byte identical to importing @clerk/react.
 *
 * When BOTH conditions hold:
 *   - the bundle is a dev build (import.meta.env.DEV), AND
 *   - VITE_DEV_AUTH_BYPASS === "1"
 * the auth gates resolve as "signed-in" with a mock user, so the member portal
 * and admin pages render locally without a real Clerk session. This can never
 * activate in a production build because import.meta.env.DEV is false there.
 *
 * Pair with the api-server's DEV_AUTH_BYPASS so /api/* calls succeed too.
 */
import type { ReactNode } from "react";
import * as RealClerk from "@clerk/react";
import { publishableKeyFromHost as realPublishableKeyFromHost } from "@clerk/react/internal";

export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_BYPASS === "1";

const MOCK_USER = {
  id: "dev_user",
  firstName: "Dev",
  lastName: "User",
  fullName: "Dev User",
  imageUrl: "",
  primaryEmailAddress: { emailAddress: "dev@localhost" },
  emailAddresses: [{ emailAddress: "dev@localhost" }],
};

export function useUser(): ReturnType<typeof RealClerk.useUser> {
  if (DEV_AUTH_BYPASS) {
    return { isLoaded: true, isSignedIn: true, user: MOCK_USER } as never;
  }
  return RealClerk.useUser();
}

export function useClerk(): ReturnType<typeof RealClerk.useClerk> {
  if (DEV_AUTH_BYPASS) {
    return {
      addListener: () => () => {},
      signOut: (cb?: unknown) => {
        if (typeof cb === "function") (cb as () => void)();
        return Promise.resolve();
      },
    } as never;
  }
  return RealClerk.useClerk();
}

type ShowProps = {
  when?: "signed-in" | "signed-out" | string;
  fallback?: ReactNode;
  children?: ReactNode;
};

export function Show(props: ShowProps) {
  if (DEV_AUTH_BYPASS) {
    // Treat the bypassed session as fully signed-in.
    if (props.when === "signed-out") return <>{props.fallback ?? null}</>;
    return <>{props.children}</>;
  }
  return <RealClerk.Show {...(props as never)} />;
}

export function ClerkProvider(props: { children?: ReactNode } & Record<string, unknown>) {
  if (DEV_AUTH_BYPASS) return <>{props.children}</>;
  return <RealClerk.ClerkProvider {...(props as never)} />;
}

export function SignIn(props: Record<string, unknown>) {
  if (DEV_AUTH_BYPASS) return <div className="text-muted-foreground text-sm">Dev auth bypass active.</div>;
  return <RealClerk.SignIn {...(props as never)} />;
}

export function SignUp(props: Record<string, unknown>) {
  if (DEV_AUTH_BYPASS) return <div className="text-muted-foreground text-sm">Dev auth bypass active.</div>;
  return <RealClerk.SignUp {...(props as never)} />;
}

export function publishableKeyFromHost(...args: Parameters<typeof realPublishableKeyFromHost>) {
  if (DEV_AUTH_BYPASS) return "pk_test_dev_bypass";
  return realPublishableKeyFromHost(...args);
}
