import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { upsertProfile } from '../lib/db'
import { Spinner } from './ui'

const NICHES = [
  '👗 Fashion & Style', '💻 Tech & Gadgets', '🍲 Food & Cooking', '💰 Personal Finance',
  '💪 Fitness & Health', '😂 Comedy & Entertainment', '🎓 Education & Career',
  '✨ Beauty & Skincare', '📈 Business & Hustle', '🎵 Music & Art', '✈️ Travel', '🔀 Other',
]

const GOALS = [
  'Grow my audience', 'Make money from content', 'Promote my business',
  'Build a personal brand', 'Land brand deals',
]

/**
 * Two-step onboarding shown after first Google login (when profile has no
 * niche yet). Saves niche + goal so every tool and the strategist chat are
 * personalized from day one.
 */
export default function Onboarding({ onDone }) {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [niche, setNiche] = useState('')
  const [goal, setGoal] = useState('')
  const [saving, setSaving] = useState(false)

  async function finish() {
    setSaving(true)
    await upsertProfile(user.id, {
      niche: niche.replace(/^\S+\s/, ''), // strip emoji
      goal,
      email: user.email,
    })
    await refreshProfile()
    setSaving(false)
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="card w-full max-w-lg p-7 shadow-2xl"
      >
        {/* progress dots */}
        <div className="mb-6 flex items-center gap-2">
          {[0, 1].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-gradient-to-r from-brand-500 to-accent-500' : 'w-4 bg-slate-200 dark:bg-ink-700'}`} />
          ))}
          <span className="ml-auto text-xs font-semibold text-slate-400">Step {step + 1} of 2</span>
        </div>

        {step === 0 && (
          <div className="animate-fade-up">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <Sparkles size={20} className="text-brand-500" /> Welcome! What's your niche?
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Every tool tunes its output to your niche — you can change this anytime in Settings.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {NICHES.map((n) => (
                <button
                  key={n}
                  onClick={() => setNiche(n)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                    niche === n
                      ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                      : 'border-slate-200 text-slate-600 hover:border-brand-400/60 dark:border-ink-600 dark:text-slate-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} disabled={!niche} className="btn-primary mt-6 w-full !py-3">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              What's your main goal? 🎯
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              We'll shape your Today's Ideas and strategist advice around this.
            </p>
            <div className="mt-5 space-y-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    goal === g
                      ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                      : 'border-slate-200 text-slate-600 hover:border-brand-400/60 dark:border-ink-600 dark:text-slate-300'
                  }`}
                >
                  {g}
                  {goal === g && <Check size={16} className="text-brand-500" />}
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(0)} className="btn-secondary flex-1 !py-3">Back</button>
              <button onClick={finish} disabled={!goal || saving} className="btn-primary flex-[2] !py-3">
                {saving ? <><Spinner size={16} /> Setting up…</> : <>Start creating <Sparkles size={16} /></>}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
