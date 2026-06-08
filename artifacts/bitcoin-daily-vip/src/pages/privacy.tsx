import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    document.title = "Privacy Policy | Bitcoin Daily VIP";
    return () => { document.title = "Bitcoin Daily VIP"; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container max-w-3xl mx-auto flex h-16 items-center px-4 md:px-6">
          <button
            onClick={() => setLocation(`${basePath}/`)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 md:px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Who We Are</h2>
            <p>
              Bitcoin Daily VIP ("we," "us," or "our") operates the membership platform at this website. We provide trade signals, market analysis, and educational content to our members. Questions about this policy can be sent to our support team via the Discord community.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Information We Collect</h2>
            <div className="space-y-2">
              <p><span className="text-foreground font-medium">Account information:</span> When you sign up, we collect your email address and password (handled securely by Clerk). If you sign in with Google, we receive the information your Google account shares.</p>
              <p><span className="text-foreground font-medium">Payment information:</span> Billing is processed by Stripe. We do not store your card number or full payment details — Stripe handles all payment data in accordance with PCI-DSS standards.</p>
              <p><span className="text-foreground font-medium">Usage data:</span> We collect standard server logs including your IP address, browser type, and pages visited to operate and improve the service.</p>
              <p><span className="text-foreground font-medium">Discord data:</span> If you connect your Discord account, we store your Discord user ID and username to manage your VIP role in our server.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. How We Use Your Information</h2>
            <div className="space-y-1">
              {[
                "To provide and maintain your membership access",
                "To process payments and manage your subscription",
                "To assign your Discord VIP role when you connect your account",
                "To send you transactional emails related to your account (receipt, trial ending, etc.)",
                "To respond to your support requests",
                "To detect and prevent fraud or abuse",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
            <p>We do not sell your personal information to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Third-Party Services</h2>
            <p>We use the following third-party services to operate the platform:</p>
            <div className="space-y-2">
              <p><span className="text-foreground font-medium">Clerk</span> — Authentication and account management. <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">clerk.com/privacy</a></p>
              <p><span className="text-foreground font-medium">Stripe</span> — Payment processing. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a></p>
              <p><span className="text-foreground font-medium">Discord</span> — Community platform. <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">discord.com/privacy</a></p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Data Retention</h2>
            <p>We retain your account information for as long as your account exists. If you delete your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g., payment records required by tax law).</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to access, correct, or delete your personal data. To exercise any of these rights, contact us via the Discord support channel or the email associated with your account. We will respond within 30 days.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Cookies</h2>
            <p>We use cookies and similar technologies to maintain your session and authentication state. These are strictly necessary for the service to function. We do not use advertising or tracking cookies.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify active members of any material changes. Continued use of the service after changes are posted constitutes your acceptance of the updated policy.</p>
          </section>
        </div>
      </main>

      <footer className="py-8 border-t border-border/40 mt-16">
        <div className="container max-w-3xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Bitcoin Daily VIP. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
