import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Trophy } from "lucide-react";
import { PortalLayout } from "@/components/portal-layout";
import { Button } from "@/components/ui/button";
import { ContentRenderer } from "@/components/ContentRenderer";
import type { GettingStartedModule } from "@/lib/content-types";

const STORAGE_KEY = "bdv_gs_progress";

export default function GettingStarted() {
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    document.title = "Getting Started | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  const [modules, setModules] = useState<GettingStartedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    fetch("/api/member/getting-started")
      .then((r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return null; }
        return r.ok ? r.json() : Promise.reject(r.status);
      })
      .then((data: GettingStartedModule[] | null) => {
        if (!data) return;
        setModules(data);
        setActiveId((prev) => {
          if (prev) return prev;
          const requested = new URLSearchParams(window.location.search).get("module");
          const match = requested && data.find((m) => m.id === requested);
          return match ? match.id : (data[0]?.id || "");
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { completed: string[] } | null) => {
        if (data?.completed?.length) {
          setCompleted(new Set(data.completed));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.completed));
        }
      })
      .catch(() => { });
  }, []);

  function saveProgress(ids: string[]) {
    fetch("/api/user/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: ids }),
    }).catch(() => { });
  }

  const activeIndex = modules.findIndex((m) => m.id === activeId);
  const activeModule = modules[activeIndex] ?? null;
  const allDone = modules.length > 0 && modules.every((m) => completed.has(m.id));

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const ids = [...next];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      saveProgress(ids);
      return next;
    });
  }

  function markAndAdvance() {
    if (!activeModule) return;
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(activeModule.id);
      const ids = [...next];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      saveProgress(ids);
      return next;
    });
    if (activeIndex < modules.length - 1) {
      setActiveId(modules[activeIndex + 1].id);
    }
  }

  useEffect(() => {
    if (forbidden) setLocation(`${basePath}/portal`);
  }, [forbidden, basePath, setLocation]);

  if (loading) {
    return (
      <PortalLayout>
        <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center justify-center py-24">
            <p className="text-muted-foreground text-sm">Loading…</p>
          </div>
        </main>
      </PortalLayout>
    );
  }

  if (forbidden) return null;

  return (
    <PortalLayout>
      <main className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
          <p className="text-muted-foreground mt-1">
            5 short modules — get up to speed and start trading with edge from day one
          </p>
        </div>

        {allDone && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Trophy className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-400">Course complete!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  You're fully set up. Head to Discord, read the morning analysis, and get after it.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
              onClick={() => setLocation(`${basePath}/portal`)}
            >
              Return to Portal →
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="space-y-1">
              {modules.map((mod, i) => {
                const done = completed.has(mod.id);
                const active = mod.id === activeId;
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveId(mod.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
                      active
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-card/50 border border-transparent"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <div className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center text-[10px] font-bold ${active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-tight ${active ? "text-foreground" : done ? "text-muted-foreground" : "text-foreground"}`}>
                        {mod.emoji} {mod.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.duration}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {activeModule && (
              <div className="rounded-2xl border border-border/50 bg-card/30 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="text-3xl mb-2">{activeModule.emoji}</div>
                    <h2 className="text-xl font-bold">{activeModule.title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeModule.duration} read</p>
                  </div>
                  <button
                    onClick={() => toggleComplete(activeModule.id)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1"
                  >
                    {completed.has(activeModule.id)
                      ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Done</>
                      : <><Circle className="h-4 w-4" /> Mark done</>
                    }
                  </button>
                </div>

                <div className="mb-8">
                  <ContentRenderer blocks={activeModule.blocks} />
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeIndex === 0}
                    onClick={() => setActiveId(modules[activeIndex - 1].id)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>

                  {activeIndex < modules.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={markAndAdvance}
                      className="gap-1 shadow-[0_0_15px_rgba(247,147,26,0.2)]"
                    >
                      {completed.has(activeModule.id) ? "Next" : "Mark Complete & Next"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => toggleComplete(activeModule.id)}
                      className={completed.has(activeModule.id) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30" : "shadow-[0_0_15px_rgba(247,147,26,0.2)]"}
                    >
                      {completed.has(activeModule.id) ? "✓ Course Complete" : "Finish Course"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </PortalLayout>
  );
}
