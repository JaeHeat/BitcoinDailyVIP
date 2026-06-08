import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const [, setLocation] = useLocation();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    document.title = "Terms of Service | Bitcoin Daily VIP";
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Bitcoin Daily VIP ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Description of Service</h2>
            <p>Bitcoin Daily VIP provides trade signals, market analysis, educational content, and access to a private Discord community. All content is for informational and educational purposes only and does not constitute financial, investment, or trading advice.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Not Financial Advice</h2>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <p className="font-medium text-amber-400">Important Disclaimer</p>
              <p><strong className="text-foreground">Nothing on this platform constitutes financial advice, investment advice, trading advice, or any other kind of financial guidance.</strong> All content — including signals, analysis, commentary, trade ideas, educational materials, and community discussion — represents the personal opinions of the creator and is shared for <strong className="text-foreground">entertainment and educational purposes only</strong>.</p>
              <p>Bitcoin Daily VIP is not a registered investment adviser, broker-dealer, financial planner, or any other type of regulated financial professional. No content should be construed as a recommendation to buy, sell, or hold any asset.</p>
              <p>Trading cryptocurrencies involves substantial risk of loss and is not suitable for all investors. Past performance — including our publicly verified track record — does not guarantee future results. You are solely responsible for your own trading decisions, position sizing, and risk management. Never trade with money you cannot afford to lose.</p>
              <p className="text-muted-foreground text-sm">By accessing this service, you acknowledge that you understand and accept this disclaimer in full.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Membership and Billing</h2>
            <div className="space-y-2">
              <p><span className="text-foreground font-medium">Trial:</span> VIP plans include a 7-day free trial. Your card is charged at the end of the trial unless you cancel before it expires.</p>
              <p><span className="text-foreground font-medium">Billing:</span> Subscriptions are billed monthly or annually in advance depending on your chosen plan. All prices are in USD.</p>
              <p><span className="text-foreground font-medium">Cancellation:</span> You may cancel your subscription at any time from your member portal. Cancellation takes effect at the end of your current billing period — you retain access until then. We do not offer prorated refunds for partial billing periods.</p>
              <p><span className="text-foreground font-medium">Refunds:</span> All sales are final. If you experience a technical issue preventing access to the service, contact us within 48 hours and we will work to resolve it or issue a credit at our discretion.</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <div className="space-y-1">
              {[
                "Share your account credentials or provide access to any non-member",
                "Redistribute, resell, or publicly post any signals, analysis, or content from Bitcoin Daily VIP",
                "Use the service for any unlawful purpose",
                "Attempt to reverse-engineer or copy any part of the platform",
                "Harass, threaten, or abuse other community members",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
            <p>Violation of these terms may result in immediate termination of your membership without refund.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Intellectual Property</h2>
            <p>All content, signals, analysis, guides, and materials published by Bitcoin Daily VIP are our proprietary intellectual property. You are granted a personal, non-transferable license to access this content as part of your membership. No other rights are granted.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Bitcoin Daily VIP and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the service or reliance on any signals or content, including any trading losses.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violation of these terms. If we terminate your account without cause, we will provide a prorated refund for the unused portion of any paid period.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Changes to Terms</h2>
            <p>We may update these terms at any time. Material changes will be communicated to active members. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Governing Law</h2>
            <p>These terms are governed by the laws of the jurisdiction in which Bitcoin Daily VIP operates. Any disputes shall be resolved through good-faith negotiation first, then binding arbitration if necessary.</p>
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
