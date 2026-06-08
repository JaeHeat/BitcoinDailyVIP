import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl font-bold text-primary">₿</span>
          <span className="text-lg font-bold tracking-tight">Bitcoin Daily VIP</span>
        </div>
        <p className="text-8xl font-extrabold tracking-tighter text-primary/30">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground">
            This page doesn't exist. You may have followed a broken link or typed the address incorrectly.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => setLocation(`${basePath}/`)}
            className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Back to home
          </button>
          <button
            onClick={() => setLocation(`${basePath}/portal`)}
            className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Go to portal
          </button>
        </div>
      </div>
    </div>
  );
}
