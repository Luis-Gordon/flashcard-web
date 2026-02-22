import { MarketingLayout } from "@/components/MarketingLayout";

export default function Privacy() {
  return (
    <MarketingLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: February 22, 2026
        </p>

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-medium [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-1">
          <h2>1. Data Controller</h2>
          <p>
            Memogenesis is operated by Luis W. Gordon (&quot;we&quot;,
            &quot;us&quot;, &quot;our&quot;). For data protection inquiries,
            contact us at privacy@memogenesis.com.
          </p>

          <h2>2. Data We Collect</h2>
          <h3>Account information</h3>
          <p>
            When you create an account, we collect your email address and an
            encrypted password hash. We never store plaintext passwords.
          </p>
          <h3>Card content</h3>
          <p>
            Text, URLs, or PDF content you submit for flashcard generation.
            Source content is retained for up to 30 days to support generation
            and enhancement, then permanently deleted.
          </p>
          <h3>Usage metrics</h3>
          <p>
            We track card generation counts, API request metadata, and
            subscription status to enforce usage limits and improve the service.
          </p>
          <h3>Payment information</h3>
          <p>
            Payment processing is handled entirely by Stripe. We never see,
            store, or process your credit card details. We retain only your
            Stripe customer ID and subscription status.
          </p>

          <h2>3. Lawful Basis for Processing</h2>
          <ul>
            <li>
              <strong>Contract performance</strong> — processing your content to
              generate flashcards as part of the service you signed up for.
            </li>
            <li>
              <strong>Legitimate interest</strong> — usage analytics, fraud
              prevention, and service improvement.
            </li>
          </ul>

          <h2>4. Data Retention</h2>
          <ul>
            <li>
              <strong>Account data</strong> — retained until you delete your
              account.
            </li>
            <li>
              <strong>Source content</strong> — deleted within 30 days of
              submission.
            </li>
            <li>
              <strong>Generated cards</strong> — retained until you delete them
              or your account.
            </li>
            <li>
              <strong>Usage records</strong> — retained for 2 years for billing
              and analytics.
            </li>
          </ul>

          <h2>5. Third-Party Processors</h2>
          <p>
            We share data with the following processors to operate the service:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> (database & authentication) — EU data
              region
            </li>
            <li>
              <strong>Stripe</strong> (payment processing) — PCI DSS compliant
            </li>
            <li>
              <strong>Cloudflare</strong> (hosting & CDN) — global edge network
            </li>
            <li>
              <strong>Anthropic</strong> (AI card generation via Claude API) —
              content sent for processing, not used for model training
            </li>
            <li>
              <strong>OpenAI</strong> (text-to-speech audio) — content sent for
              TTS generation only
            </li>
            <li>
              <strong>Unsplash</strong> (image suggestions) — search queries
              only, no user content
            </li>
          </ul>

          <h2>6. Your Rights</h2>
          <p>
            Under the GDPR and applicable data protection laws, you have the
            right to:
          </p>
          <ul>
            <li>
              <strong>Access</strong> — request a copy of your personal data.
            </li>
            <li>
              <strong>Rectification</strong> — correct inaccurate data.
            </li>
            <li>
              <strong>Erasure</strong> — request deletion of your data (&quot;right to
              be forgotten&quot;).
            </li>
            <li>
              <strong>Portability</strong> — receive your data in a structured,
              machine-readable format.
            </li>
            <li>
              <strong>Restriction</strong> — limit how we process your data.
            </li>
            <li>
              <strong>Object</strong> — object to processing based on legitimate
              interest.
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact privacy@memogenesis.com. We
            will respond within 30 days.
          </p>

          <h2>7. Cookies</h2>
          <p>
            We use only functional cookies required for authentication (Supabase
            session management). We do not use tracking cookies, analytics
            cookies, or third-party advertising cookies.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will
            be communicated via email or an in-app notification. Continued use
            of the service after changes constitutes acceptance.
          </p>

          <h2>9. Contact</h2>
          <p>
            For privacy-related questions or concerns, contact us at
            privacy@memogenesis.com.
          </p>
        </div>
      </article>
    </MarketingLayout>
  );
}
