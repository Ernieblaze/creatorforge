import { Link } from 'react-router-dom'
import { Logo, ThemeToggle } from '../components/ui'

export const SUPPORT_EMAIL = 'ernieblazze@gmail.com'

function LegalShell({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-ink-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-ink-700/60 dark:bg-ink-900/80">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo /></Link>
          <ThemeToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-xs text-slate-400">Last updated: {updated}</p>
        <div className="prose-sm mt-8 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-ink-700">
          Questions? Contact us at <a className="font-semibold text-brand-500 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> ·{' '}
          <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/privacy" className="hover:underline">Privacy</Link>
        </p>
      </main>
    </div>
  )
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="19 July 2026">
      <section>
        <h2>1. Who we are</h2>
        <p>
          CreatorForge ("we", "us") provides AI-powered content-creation tools for creators and
          small businesses, operated from Nigeria. By creating an account or using the service you
          agree to these terms.
        </p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>You must provide accurate information and keep your login method secure.</li>
          <li>One person per account. You are responsible for activity under your account.</li>
          <li>We may suspend accounts that abuse the service, attempt to bypass usage limits, or break the law.</li>
        </ul>
      </section>
      <section>
        <h2>3. Plans, credits & payments</h2>
        <ul>
          <li>The Free plan includes 5 credits per day. Premium (₦3,000/month or ₦30,000/year) includes 50 credits per day under a fair-use policy.</li>
          <li>Payments are processed by <b>Paystack</b>; we never see or store your card details.</li>
          <li>Subscriptions renew automatically until cancelled. Cancelling stops future charges; access continues until the end of the paid period. Fees already paid are non-refundable except where required by law or where a charge was made in error.</li>
        </ul>
      </section>
      <section>
        <h2>4. AI-generated content</h2>
        <ul>
          <li>You own the content you generate and may use it commercially.</li>
          <li>AI output can be inaccurate or similar to others' output — review everything before publishing. You are responsible for what you publish.</li>
          <li>Don't use the tools to create illegal, deceptive, or harmful content.</li>
        </ul>
      </section>
      <section>
        <h2>5. Partner (affiliate) program</h2>
        <ul>
          <li>Partnership requires an application and our approval; commission rates are set per partner and may change for future earnings with notice.</li>
          <li>Commissions are earned only on real, settled payments by referred customers, become withdrawable after a 14-day holding period, and are paid manually to your Nigerian bank account (minimum payout ₦5,000).</li>
          <li>Self-referrals, fake accounts, misleading advertising, or spam void commissions and may lead to suspension.</li>
        </ul>
      </section>
      <section>
        <h2>6. Service & liability</h2>
        <ul>
          <li>The service is provided "as is"; we work hard on uptime but do not guarantee uninterrupted availability.</li>
          <li>To the maximum extent permitted by law, our total liability is limited to the amount you paid us in the last 3 months.</li>
        </ul>
      </section>
      <section>
        <h2>7. Changes</h2>
        <p>We may update these terms; material changes will be announced in the app. Continued use after changes means acceptance.</p>
      </section>
    </LegalShell>
  )
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="19 July 2026">
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><b>Account data:</b> email, name and avatar from Google sign-in (or just your email for email-link sign-in).</li>
          <li><b>Profile data you provide:</b> username, bio, niche, goals — used to personalize AI output.</li>
          <li><b>Content:</b> the prompts you submit and the content generated, stored so your library works across devices.</li>
          <li><b>Payment data:</b> handled entirely by Paystack. We store only your subscription status and plan — never card numbers.</li>
          <li><b>Partner data:</b> if you join the partner program, the bank details you enter for payouts.</li>
        </ul>
      </section>
      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>To run the service: generate content, sync your library, enforce daily limits.</li>
          <li>Your prompts are sent to AI providers (e.g. Groq, Google) solely to generate your content.</li>
          <li>We do not sell your personal data. Ever.</li>
        </ul>
      </section>
      <section>
        <h2>3. Storage & security</h2>
        <p>
          Data is stored with Supabase (managed Postgres) with row-level security — your content is
          readable only by you and site administration. Traffic is encrypted (HTTPS).
        </p>
      </section>
      <section>
        <h2>4. Your rights (NDPR)</h2>
        <ul>
          <li><b>Export:</b> download all your data anytime from Settings → Your data.</li>
          <li><b>Deletion:</b> delete your account and all associated data from Settings → Danger zone, or by emailing us.</li>
          <li><b>Correction:</b> edit your profile details anytime in Settings.</li>
        </ul>
      </section>
      <section>
        <h2>5. Cookies & tracking</h2>
        <p>We use only essential storage (your login session and preferences). No third-party advertising trackers.</p>
      </section>
      <section>
        <h2>6. Contact</h2>
        <p>Data questions or requests: email us and we'll respond within 30 days.</p>
      </section>
    </LegalShell>
  )
}
