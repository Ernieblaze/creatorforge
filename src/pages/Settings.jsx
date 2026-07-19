import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Crown, KeyRound, User, CreditCard, Download, ExternalLink, XCircle, Gift, Copy, LifeBuoy, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { upsertProfile, listGenerations } from '../lib/db'
import { getAIConfig, setAIOverride } from '../lib/ai'
import { getMySubscription, cancelSubscription, getManageLink, isPaystackConfigured, verifyPayment } from '../lib/billing'
import { Spinner } from '../components/ui'
import { useToast } from '../components/toast'

const NICHES = [
  'Fashion & Style', 'Tech & Gadgets', 'Food & Cooking', 'Personal Finance',
  'Fitness & Health', 'Comedy & Entertainment', 'Education & Career',
  'Beauty & Skincare', 'Business & Hustle', 'Music & Art', 'Travel', 'Other',
]

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500"><Icon size={16} /></span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Billing: current plan, renewal info from the subscriptions table, and
 * subscription self-service (cancel auto-renewal / update card via
 * Paystack's hosted page).
 */
function BillingSection({ plan }) {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [sub, setSub] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null) // { kind: 'ok'|'err', text }
  const [reference, setReference] = useState('')
  const [verifying, setVerifying] = useState(false)

  // "I paid but I'm still free" rescue: re-check the profile (webhook may
  // have landed by now), and let the user verify a specific Paystack
  // reference from their receipt email.
  async function handleRecheck() {
    setVerifying(true)
    setNotice(null)
    try {
      await refreshProfile()
      setSub(await getMySubscription(user.id))
      toast('Plan status refreshed')
    } finally {
      setVerifying(false)
    }
  }

  async function handleVerifyReference() {
    const ref = reference.trim()
    if (!ref || verifying) return
    setVerifying(true)
    setNotice(null)
    try {
      await verifyPayment(ref)
      await refreshProfile()
      setSub(await getMySubscription(user.id))
      setNotice({ kind: 'ok', text: '✅ Payment confirmed — Premium is now active!' })
    } catch (e) {
      setNotice({ kind: 'err', text: `Could not verify that reference: ${e.message}` })
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (user) getMySubscription(user.id).then(setSub)
  }, [user, plan])

  async function handleCancel() {
    if (busy) return
    if (!window.confirm('Cancel auto-renewal? Premium stays active until the end of your paid period.')) return
    setBusy(true)
    setNotice(null)
    try {
      const res = await cancelSubscription()
      if (res.demo) await upsertProfile(user.id, { plan: 'free' })
      toast(res.message || 'Auto-renewal cancelled.')
      setNotice(null)
      await refreshProfile()
      setSub(await getMySubscription(user.id))
    } catch (e) {
      setNotice({ kind: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleManageCard() {
    setBusy(true)
    setNotice(null)
    try {
      const link = await getManageLink()
      window.open(link, '_blank', 'noopener')
    } catch (e) {
      setNotice({ kind: 'err', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const renewal = profile?.premium_until || sub?.expires_at

  return (
    <Section icon={CreditCard} title="Billing & plan">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Current plan</p>
          <p className="mt-0.5 flex items-center gap-2 text-lg font-extrabold capitalize text-slate-900 dark:text-white">
            {plan} {plan === 'premium' && <Crown size={17} className="text-amber-400" />}
          </p>
          {plan === 'premium' && (
            <p className="mt-1 text-xs text-slate-400">
              {sub?.status === 'cancelled'
                ? `Auto-renewal off — access until ${renewal ? new Date(renewal).toLocaleDateString() : 'period end'}`
                : renewal
                  ? `Renews ${sub?.interval === 'yearly' ? 'yearly' : 'monthly'} · next period ends ${new Date(renewal).toLocaleDateString()}`
                  : `₦${sub?.interval === 'yearly' ? '30,000/year' : '3,000/month'}`}
            </p>
          )}
        </div>
        {plan === 'free' ? (
          <Link to="/app/pricing" className="btn-primary"><Crown size={16} /> Upgrade to Premium</Link>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isPaystackConfigured() && (
              <button onClick={handleManageCard} disabled={busy} className="btn-secondary !px-4 !py-2 text-sm">
                <ExternalLink size={14} /> Update card
              </button>
            )}
            {sub?.status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/60 px-4 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 dark:border-rose-500/40"
              >
                {busy ? <Spinner size={14} /> : <XCircle size={14} />} Cancel renewal
              </button>
            )}
          </div>
        )}
      </div>
      {notice && (
        <p className={`mt-4 rounded-xl px-4 py-2.5 text-xs ${
          notice.kind === 'ok'
            ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
            : 'border border-rose-400/40 bg-rose-400/10 text-rose-500'
        }`}>
          {notice.text}
        </p>
      )}
      {plan === 'free' && isPaystackConfigured() && (
        <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-ink-700">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Paid but still showing Free?</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            First tap refresh — activation can take a minute. Still free? Paste the payment
            <b> reference</b> from your Paystack receipt email (looks like <i>T123456789012345</i>) and verify it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={handleRecheck} disabled={verifying} className="btn-secondary !px-3.5 !py-2 text-xs">
              {verifying ? <Spinner size={13} /> : null} Refresh status
            </button>
            <input
              className="input-base !w-auto min-w-44 flex-1 !py-2 text-xs"
              placeholder="Paystack reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <button onClick={handleVerifyReference} disabled={verifying || !reference.trim()} className="btn-primary !px-3.5 !py-2 text-xs">
              Verify payment
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        {isPaystackConfigured()
          ? 'Payments and card details are handled by Paystack — we never see your card.'
          : 'Demo billing until Paystack keys are configured (see README).'}
      </p>
    </Section>
  )
}

export default function Settings() {
  const { user, profile, plan, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [niche, setNiche] = useState('')
  const [goal, setGoal] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const [ai, setAi] = useState(() => {
    const c = getAIConfig()
    const hasOverride = Boolean(localStorage.getItem('cf_ai_override'))
    return { provider: c.provider, apiKey: hasOverride ? c.apiKey : '', model: hasOverride ? c.model : '' }
  })

  useEffect(() => {
    setUsername(profile?.username || '')
    setBio(profile?.bio || '')
    setNiche(profile?.niche || '')
    setGoal(profile?.goal || '')
  }, [profile])

  async function saveProfile() {
    await upsertProfile(user.id, { username, bio, niche, goal, email: user.email })
    refreshProfile()
    toast('Profile saved')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  function saveAI() {
    if (ai.apiKey || ai.model) setAIOverride(ai)
    else setAIOverride({})
    toast('AI settings saved')
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Profile, billing and advanced options.</p>
      </div>

      <Section icon={User} title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Username</label>
            <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. adaeze_creates" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Your niche</label>
            <select className="input-base" value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option value="">Select your niche…</option>
              {NICHES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Bio</label>
            <textarea rows={2} className="input-base resize-y" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="One or two lines about you and what you create" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Main goal</label>
            <input className="input-base" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Hit 10k followers and launch my digital product by December" />
          </div>
        </div>
        <button onClick={saveProfile} className="btn-primary mt-5">
          {savedFlash ? <><Check size={16} /> Saved</> : 'Save profile'}
        </button>
        <p className="mt-3 text-xs text-slate-400">Signed in as {user?.email}</p>
      </Section>

      <BillingSection plan={plan} />

      <Section icon={KeyRound} title="AI provider (advanced)">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Bring your own key to switch providers instantly. Leave blank to use the app default.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Provider</label>
            <select className="input-base" value={ai.provider} onChange={(e) => setAi({ ...ai, provider: e.target.value })}>
              <option value="groq">Groq (free tier)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">API key</label>
            <input type="password" className="input-base" value={ai.apiKey} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-…" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Model (optional)</label>
            <input className="input-base" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="provider default" />
          </div>
        </div>
        <button onClick={saveAI} className="btn-secondary mt-5">
          {savedFlash ? <><Check size={16} className="text-emerald-500" /> Saved</> : 'Save AI settings'}
        </button>
      </Section>

      <Section icon={Gift} title="Invite friends — earn credits">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Share your link. When a friend signs up with it, you <b>both</b> get{' '}
          <span className="font-bold text-brand-500">+5 bonus credits</span> — they kick in
          automatically whenever your daily credits run out.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            className="input-base min-w-56 flex-1 text-xs"
            value={`${window.location.origin}/?ref=${user?.id ?? ''}`}
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/?ref=${user?.id ?? ''}`)
              toast('Invite link copied — share it anywhere!')
            }}
            className="btn-primary !px-4 !py-2.5 text-sm"
          >
            <Copy size={14} /> Copy link
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Bonus credits available: <b className="text-brand-500">{profile?.bonus_credits ?? 0}</b>
        </p>
      </Section>

      <Section icon={Download} title="Your data">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Download everything — your profile and all generated content — as a single JSON file. Your data is yours.
        </p>
        <button
          onClick={async () => {
            const content = await listGenerations(user.id, { limit: 1000 })
            const blob = new Blob(
              [JSON.stringify({ exported_at: new Date().toISOString(), profile, content }, null, 2)],
              { type: 'application/json' }
            )
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'creatorforge-data.json'
            a.click()
            URL.revokeObjectURL(a.href)
            toast('Your data has been downloaded')
          }}
          className="btn-secondary"
        >
          <Download size={16} /> Export my data (JSON)
        </button>
      </Section>

      <Section icon={LifeBuoy} title="Support">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Stuck, found a bug, or a payment issue? Email{' '}
          <a href="mailto:ernieblazze@gmail.com" className="font-semibold text-brand-500 hover:underline">
            ernieblazze@gmail.com
          </a>{' '}
          and include a screenshot if you can — we reply fast.
        </p>
      </Section>

      {isSupabaseConfigured && (
        <section className="card border-rose-300/50 p-5 sm:p-6 dark:border-rose-500/30">
          <h2 className="mb-3 flex items-center gap-2.5 font-bold text-rose-500">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-500"><Trash2 size={16} /></span>
            Danger zone
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Permanently delete your account and ALL data — profile, content library, chat history,
            bio page and partner records. This cannot be undone. Consider exporting your data first.
          </p>
          <button
            onClick={async () => {
              const typed = window.prompt('This permanently deletes your account and all data. Type DELETE to confirm:')
              if (typed !== 'DELETE') return
              try {
                const { error } = await supabase.rpc('delete_my_account')
                if (error) throw error
                await signOut()
                window.location.href = '/'
              } catch (e) {
                toast(e.message || 'Deletion failed — contact support.', 'error')
              }
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-rose-400/60 px-4 py-2 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/10"
          >
            <Trash2 size={14} /> Delete my account
          </button>
        </section>
      )}
    </div>
  )
}
