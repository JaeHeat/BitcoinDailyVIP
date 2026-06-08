import { Link } from "wouter";

export default function Signup() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Coming soon</h1>
        <p className="text-xl text-muted-foreground">Checkout launching shortly.</p>
        <div className="pt-8">
          <Link href="/" className="text-primary hover:underline">
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
