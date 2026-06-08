import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetDiscordSyncLogs, ApiError } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDiscord() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [failuresOnly, setFailuresOnly] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useGetDiscordSyncLogs(
    { limit: 100, failuresOnly },
    { query: { queryKey: ["discordSyncLogs", failuresOnly], retry: false } },
  );

  const logs = data?.logs ?? [];
  const isForbidden =
    isError &&
    error instanceof ApiError &&
    (error.status === 403 || error.status === 401);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              onClick={() => setLocation(`${basePath}/portal`)}
            >
              ← Back to Portal
            </button>
            <span className="text-border">|</span>
            <span className="font-bold tracking-tight">Discord Sync Status</span>
          </div>
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-6">
        {isForbidden && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-lg font-semibold text-destructive">Access Denied</p>
              <p className="text-sm text-muted-foreground">
                This page is restricted to admins. Set{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">ADMIN_CLERK_USER_ID</code>{" "}
                in your environment to your Clerk user ID to unlock access.
              </p>
            </CardContent>
          </Card>
        )}

        {!isForbidden && (
          <>
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="text-3xl font-bold mt-1">{data?.totalCount ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Failed Syncs</p>
              <p className={`text-3xl font-bold mt-1 ${(data?.failureCount ?? 0) > 0 ? "text-destructive" : "text-emerald-400"}`}>
                {data?.failureCount ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold mt-1 text-emerald-400">
                {data && data.totalCount > 0
                  ? `${Math.round(((data.totalCount - data.failureCount) / data.totalCount) * 100)}%`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Log table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg">Sync Events</CardTitle>
                <CardDescription>Recent Discord role sync attempts</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={failuresOnly}
                    onChange={(e) => setFailuresOnly(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  Failures only
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetching}
                  onClick={() => refetch()}
                >
                  {isFetching ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                {failuresOnly ? "No failed syncs — all good!" : "No sync events yet."}
              </p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground text-left">
                      <th className="pb-3 px-2 font-medium">Status</th>
                      <th className="pb-3 px-2 font-medium">Action</th>
                      <th className="pb-3 px-2 font-medium">Stripe Event</th>
                      <th className="pb-3 px-2 font-medium">Discord ID</th>
                      <th className="pb-3 px-2 font-medium">Attempts</th>
                      <th className="pb-3 px-2 font-medium">Error</th>
                      <th className="pb-3 px-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className={`border-b border-border/30 last:border-0 ${!log.success ? "bg-destructive/5" : ""}`}
                      >
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${log.success ? "text-emerald-400" : "text-destructive"}`}
                          >
                            {log.success ? "✓ OK" : "✕ Failed"}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                          {log.action}
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                          {log.stripeEvent ?? "—"}
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                          {log.discordUserId ? log.discordUserId.slice(0, 10) + "…" : "—"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-xs ${log.attempts >= 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                            {log.attempts}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-destructive max-w-[200px] truncate" title={log.errorMessage ?? undefined}>
                          {log.errorMessage ?? "—"}
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
      </main>
    </div>
  );
}
