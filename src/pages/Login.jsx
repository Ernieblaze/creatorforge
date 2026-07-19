import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo, ThemeToggle, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { Sparkles, Mail, CheckCircle2, ExternalLink } from 'lucide-react'

/** WhatsApp/Instagram/Facebook in-app browsers block Google OAuth
 *  ("disallowed_useragent"). Detect them so we can steer those users
 *  to the email link, which works everywhere. */
const isInAppBrowser = () =>
  /FB_IAB|FBAN|FBAV|Instagram|WhatsApp|Messenger|Snapchat|TikTok|musical_ly|Line\//i.test(
    navigator.userAgent,
  )

export default function Login() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const inApp = isInAppBrowser()

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate('/app', { replace: true })
  }, [user, navigate])

  async function sendMagicLink(e) {
    e.preventDefault()
    const addr = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(addr) || sending) return
    setSending(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(
        /rate/i.test(err.message)
          ? 'Too many requests — please wait a minute and try again.'
          : err.message || 'Could not send the link — please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-white px-4 dark:bg-ink-900">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-160 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent-600/15 blur-3xl" />
      </div>
      <div className="absolute top-5 right-5"><ThemeToggle /></div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card relative w-full max-w-sm p-8 text-center shadow-2xl shadow-brand-600/10"
      >
        <Link to="/" className="inline-block"><Logo size="lg" /></Link>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Welcome back, creator
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          One click and your content OS is ready.
        </p>

        {inApp && (
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 text-left text-xs leading-relaxed text-amber-600 dark:text-amber-400">
            <ExternalLink size={14} className="mt-0.5 shrink-0" />
            You're inside an app's built-in browser, where Google login may be blocked.
            Use the <b>email link below</b> — or tap the ⋮ / share menu and choose "Open in browser".
          </p>
        )}

        <button onClick={signInWithGoogle} className="btn-primary mt-6 w-full !py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
          Continue with Google
        </button>

        {isSupabaseConfigured && (
          <>
            <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-300 dark:text-ink-600">
              <span className="h-px flex-1 bg-slate-200 dark:bg-ink-700" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-ink-700" />
            </div>

            {sent ? (
              <p className="flex items-start gap-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-left text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                <span>
                  <b>Check your email!</b> We sent a sign-in link to {email.trim()}. Open it on this
                  device and you're in — no password needed.
                </span>
              </p>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-2.5">
                <input
                  type="email"
                  required
                  className="input-base"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
                <button type="submit" disabled={sending} className="btn-secondary w-full !py-3">
                  {sending ? <Spinner size={15} /> : <Mail size={15} />} Email me a sign-in link
                </button>
                {error && <p className="text-xs text-rose-500">{error}</p>}
              </form>
            )}
          </>
        )}

        {!isSupabaseConfigured && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-500">
            <Sparkles size={13} /> Demo mode — Supabase not configured yet, session is local.
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </motion.div>
    </div>
  )
}
