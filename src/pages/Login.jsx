import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo, ThemeToggle } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { Sparkles } from 'lucide-react'

export default function Login() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/app', { replace: true })
  }, [user, navigate])

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

        <button onClick={signInWithGoogle} className="btn-primary mt-8 w-full !py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
          Continue with Google
        </button>

        {!isSupabaseConfigured && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-500">
            <Sparkles size={13} /> Demo mode — Supabase not configured yet, session is local.
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-slate-400">
          By continuing you agree to our Terms & Privacy Policy.
          <br />Email/password login coming soon.
        </p>
      </motion.div>
    </div>
  )
}
