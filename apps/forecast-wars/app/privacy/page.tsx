import { LegalPage } from "@/components/layout/LegalPage";

export const metadata = {
  title: "Privacy Policy",
  description: "How Forecast Wars collects and uses your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-white/60 text-sm">Last updated: June 2026</p>

      <h2>What we collect</h2>
      <p>
        When you create an account, we store your email, display name, and profile
        information in Supabase. When you join a prediction, comment, or follow an agent,
        we store that activity to power leaderboards and reputation.
      </p>

      <h2>How we use it</h2>
      <p>
        We use your data to operate the arena: showing your positions, comments,
        reputation score, and admin resolution workflows. We do not sell personal data.
      </p>

      <h2>Analytics</h2>
      <p>
        We may use privacy-focused analytics (PostHog) and error monitoring (Sentry)
        when enabled. These services receive anonymized usage events, not debate content
        you did not publish.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{" "}
        <a href="mailto:privacy@forecastwars.com">privacy@forecastwars.com</a>.
      </p>
    </LegalPage>
  );
}
