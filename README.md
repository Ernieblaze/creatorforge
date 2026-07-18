# ⚡ CreatorForge

**The complete operating system for content creators & hustlers.** 17 AI tools in one premium workspace — posts, scripts, ads, calendars, viral scoring and strategy — built for Nigerian creators, students and small businesses.

## Stack

- **Frontend:** Vite + React + Tailwind CSS v4 + Framer Motion
- **Backend:** Supabase (Google auth, Postgres + RLS, content history)
- **AI:** Modular provider layer — Groq (free tier), OpenAI, or Anthropic; swap with one env var
- **PWA-ready:** manifest + service worker included

## Quick start

```bash
npm install
npm run dev
```

The app runs immediately in **demo mode** — local auth session, localStorage persistence, and rich built-in sample generations — so you can explore everything before configuring keys.

## Going live (3 steps)

### 1. Supabase (auth + database)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole of [`supabase/schema.sql`](supabase/schema.sql). It's safe to re-run after upgrades and sets up:
   - `profiles` (username, bio, niche, goal, plan), `generations` (full library history), `subscriptions`
   - `announcements` — admin-published banners, added to the realtime publication so users see them **instantly**
   - `chat_messages` — AI Strategist history, synced across devices
   - `admins` + `is_admin()` — **edit the seeded email in the script if yours differs**; must match `VITE_ADMIN_EMAIL`
   - RLS on every table: users see only their own rows; admins can read everything
   - Server-side triggers: free users hard-capped at **10 generations/day**, and the `plan` column can only be changed by the service role (payment webhook) or an admin — never from the browser
3. Enable Google under **Authentication → Providers** ([guide](https://supabase.com/docs/guides/auth/social-login/auth-google)); add `http://localhost:5173` and your production URL to redirect URLs.
4. Copy the project URL + anon key into `.env` (see `.env.example`).

### 2. AI provider — the `generate-content` Edge Function

All 13 tools call one Edge Function so the provider key **never ships to the browser**. It verifies the caller's JWT, enforces the free-plan daily limit server-side, calls the provider, and logs tokens + cost to `ai_usage` for the admin monitor.

Deploy it with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy generate-content
supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_your_groq_key
# optional: supabase secrets set AI_MODEL=llama-3.3-70b-versatile
```

Get a free Groq key at [console.groq.com](https://console.groq.com/keys). **Switching provider later is one secret change** — `AI_PROVIDER=openai` or `AI_PROVIDER=anthropic` (plus the matching `AI_API_KEY`); models default sensibly per provider.

Quick test after deploying (paste a real user access token from DevTools → Application → Local Storage → `sb-…-auth-token`):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/generate-content" \
  -H "Authorization: Bearer <user-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"tool":"post-generator","system":"You are a helpful copywriter.","messages":[{"role":"user","content":"One-line hook about side hustles"}]}'
```

Call-path fallbacks (in `src/lib/ai.js`): a user's own key from **Settings → AI provider** takes precedence (direct call); `VITE_AI_API_KEY` in `.env` works for keyless local dev; with nothing configured the app serves built-in demo content.

### 3. Admin access

Set your email in `.env` **and** make sure the same email is in the `admins` table (the schema seeds it):

```env
VITE_ADMIN_EMAIL=you@gmail.com
```

`/admin` (overview, users, revenue, tool analytics, AI cost monitor, feature flags, announcements, logs) unlocks for that account. The env var gates the UI; the `admins` table + RLS gate the actual data.

### 4. Verify the live wiring (2 minutes)

After keys are in `.env` and the schema has run:

1. **Limits** — on a free account, generate 10 times; the 11th must fail with *"Daily free limit reached"* even if you bypass the UI (the DB trigger enforces it).
2. **Announcements** — open the app in two browsers (admin + normal user). Publish from `/admin/announcements`; the banner must appear in the other browser within a second or two, without a refresh.
3. **Chat history** — chat with the Strategist, sign in on another device/browser: the conversation should be restored.
4. **RLS** — in the SQL editor run `select * from generations;` as an anon/user JWT (Supabase "Impersonate" feature): a normal user gets only their rows; your admin account gets all rows.
5. **Plan protection** — from the browser console try updating your own profile `plan` to `premium`; it should silently stay `free`.

## Payments — Paystack subscriptions

Premium (₦3,000/month · ₦30,000/year) runs on real Paystack subscriptions. The client never decides who is premium: checkout success is verified server-side (`paystack-verify`), and the webhook keeps renewals/cancellations in sync. Setup:

**1. Paystack dashboard**
- Copy your **public key** (Settings → API Keys) into `.env` as `VITE_PAYSTACK_PUBLIC_KEY`.
- Create two **Plans** (Payments → Plans): ₦3,000 monthly and ₦30,000 yearly. Put their `PLN_...` codes in `.env` (`VITE_PAYSTACK_PLAN_MONTHLY` / `VITE_PAYSTACK_PLAN_YEARLY`).

**2. Deploy the billing functions**

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...   # or sk_test_ while testing
supabase functions deploy paystack-verify
supabase functions deploy paystack-manage
supabase functions deploy paystack-webhook --no-verify-jwt   # ← flag required: Paystack sends no JWT
```

**3. Webhook URL** — in Paystack Dashboard → Settings → API Keys & Webhooks, set:

```
https://<project-ref>.supabase.co/functions/v1/paystack-webhook
```

Every request is authenticated by verifying Paystack's `x-paystack-signature` (HMAC-SHA512 of the raw body with your secret key). Handled events: `charge.success` (activate/renew premium), `subscription.create` (store the codes needed for cancellation), `subscription.disable` / `subscription.not_renew` (stop renewal; access continues until the paid period ends), `invoice.payment_failed` (expire access).

**4. Test with Paystack test mode** — use `sk_test_`/`pk_test_` keys and card `4084 0840 8408 4081` (any future expiry, CVV 408). Pay from the Pricing page, confirm the dashboard shows "Premium active", then cancel from Settings → Billing and check the subscription row flips to `cancelled`.

How lapsing works: cancellation keeps `premium_until` intact, so access runs to the end of the paid period; after that both the client and the server-side daily-limit trigger treat the account as free automatically — no cron needed.

## Deployment (Vercel or Netlify)

The frontend is a static Vite build; Supabase hosts the database, auth, and edge functions. SPA rewrites are already configured (`vercel.json` for Vercel, `public/_redirects` for Netlify) so deep links like `/app/tool/post-generator` survive refresh.

**Order matters — backend first:**

**1. Supabase (once)**
1. Run all of `supabase/schema.sql` in the SQL Editor (idempotent).
2. Enable Google auth; add your production URL (e.g. `https://creatorforge.vercel.app`) to **Authentication → URL Configuration → Redirect URLs** — without this, Google login loops back to localhost.
3. Deploy the four edge functions and secrets:
   ```bash
   supabase link --project-ref <ref>
   supabase secrets set AI_PROVIDER=groq AI_API_KEY=gsk_... PAYSTACK_SECRET_KEY=sk_live_...
   supabase functions deploy generate-content
   supabase functions deploy paystack-verify
   supabase functions deploy paystack-manage
   supabase functions deploy paystack-webhook --no-verify-jwt
   ```
4. Point Paystack's webhook at `https://<ref>.supabase.co/functions/v1/paystack-webhook` (Dashboard → Settings → API Keys & Webhooks).

**2. Vercel**
```bash
npm i -g vercel && vercel
```
Or connect the Git repo at vercel.com → framework preset **Vite** (build `npm run build`, output `dist`). Then add the environment variables from `.env` under **Project → Settings → Environment Variables**:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAIL`, `VITE_PAYSTACK_PUBLIC_KEY`, `VITE_PAYSTACK_PLAN_MONTHLY`, `VITE_PAYSTACK_PLAN_YEARLY`. (Do **not** add `VITE_AI_API_KEY` in production — AI runs through the edge function.) Redeploy after adding vars.

**2-alt. Netlify**
Site settings: build `npm run build`, publish directory `dist`, same env vars under **Site configuration → Environment variables**. `public/_redirects` handles routing.

**3. Post-deploy smoke test**
1. Open the production URL → landing loads, dark/light toggle works.
2. Sign in with Google → onboarding (niche + goal) appears once.
3. Generate a post → output renders, appears in Library, admin **AI Usage** shows the call.
4. Publish an announcement from `/admin` in one browser → banner appears live in another.
5. Pay with a Paystack test card → "Premium active" chip on the dashboard → cancel from Settings.
6. Lighthouse PWA check passes (manifest + service worker are served from the root).

## Project map

```
src/
  lib/
    supabase.js     Supabase client + admin check (demo fallback)
    ai.js           Modular AI providers + usage/cost logging
    demoContent.js  Built-in sample generations (no-key mode)
    db.js           Profiles, history, freemium limits (Supabase ⇄ localStorage)
    tools.js        ★ Tool registry — add a new AI tool as one config object
  context/          Auth (Google/demo) + Theme (dark-first)
  layout/           App shell: sidebar (desktop) + bottom nav (mobile)
  pages/            Landing, Login, Dashboard, ToolPage, Library,
                    Settings, Pricing, Admin
supabase/schema.sql Tables + RLS + server-side daily limit trigger
```

## Adding a new tool

Add one object to `src/lib/tools.js` (name, icon, fields, system prompt, `buildPrompt`) — it automatically appears in the sidebar, landing page, dashboard and gets history/limits for free.

## Roadmap hooks already in place

- Scheduling integration → feature flag in Admin, calendar tool ready
- Template sharing/moderation → flagged off in Admin
- Email/password auth → add via Supabase, `Login.jsx` notes it
