import { useState } from 'react'
import { Check, Crown, Minus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { startCheckout as paystackCheckout, isPaystackConfigured } from '../lib/billing'
import { Spinner } from '../components/ui'
import { useToast } from '../components/toast'

/**
 * Upgrade page. Real Paystack inline checkout (plan codes from .env);
 * payment is verified server-side by the paystack-verify edge function
 * before premium activates. Demo-simulated until keys are configured.
 */
export default function Pricing() {
  const { user, plan, refreshProfile } = useAuth()
  const toast = useToast()
  const [yearly, setYearly] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  async function startCheckout() {
    if (processing) return
    setProcessing(true)
    setError('')
    try {
      const result = await paystackCheckout({ user, interval: yearly ? 'yearly' : 'monthly' })
      if (result.status === 'success') {
        await refreshProfile()
        toast('Welcome to Premium! 🎉')
      } else if (result.status === 'cancelled') {
        toast('Checkout closed — you were not charged', 'info')
      }
    } catch (e) {
      setError(e.message || 'Payment failed — you were not charged, or contact support with your reference.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Upgrade to <span className="text-gradient">Premium</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Unlimited content. Priority AI. Full history. Exports.</p>

        <div className="mt-6 inline-flex rounded-xl border border-slate-200 p-1 dark:border-ink-600">
          {[['Monthly', false], ['Yearly · save 2 months', true]].map(([label, val]) => (
            <button
              key={label}
              onClick={() => setYearly(val)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                yearly === val ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mt-8 border-brand-500/40 p-7 shadow-xl shadow-brand-600/10">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Crown size={18} className="text-amber-400" /> Premium</p>
          {plan === 'premium' && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">ACTIVE</span>}
        </div>
        <p className="mt-4 text-4xl font-extrabold text-slate-900 dark:text-white">
          ₦{yearly ? '30,000' : '3,000'}
          <span className="text-base font-medium text-slate-400">/{yearly ? 'year' : 'month'}</span>
        </p>
        <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          {[
            'Unlimited daily generations',
            'Advanced modes on every tool',
            'Priority AI (faster, smarter models)',
            'Full content history & exports',
            'Early access to new tools',
            'Priority WhatsApp support',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2.5"><Check size={16} className="shrink-0 text-emerald-500" /> {f}</li>
          ))}
        </ul>
        {plan === 'premium' ? (
          <p className="mt-7 rounded-xl bg-emerald-500/10 py-3 text-center text-sm font-semibold text-emerald-500">
            You're Premium. Go create something great. 🚀
          </p>
        ) : (
          <>
            <button onClick={startCheckout} disabled={processing} className="btn-primary mt-7 w-full !py-3.5">
              {processing ? <><Spinner size={17} /> Processing…</> : `Pay ₦${yearly ? '30,000' : '3,000'} with Paystack`}
            </button>
            {error && (
              <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-2.5 text-center text-xs text-rose-500">{error}</p>
            )}
          </>
        )}
        <p className="mt-3 text-center text-xs text-slate-400">
          {isPaystackConfigured()
            ? 'Secured by Paystack · Cancel anytime from Settings'
            : 'Demo checkout until Paystack keys are added to .env'}
        </p>
      </div>

      {/* Free vs Premium comparison */}
      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-ink-700">
              <th className="px-5 py-3.5 font-semibold">What you get</th>
              <th className="px-4 py-3.5 text-center font-semibold">Free</th>
              <th className="px-4 py-3.5 text-center font-semibold text-brand-500">Premium</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Daily credits', '5 / day', 'Unlimited'],
              ['Advanced (premium-quality) mode', 'Limited', 'Unlimited'],
              ['All 17 AI tools', true, true],
              ['Content library & search', true, true],
              ['Viral Score + "Improve again"', true, true],
              ['30-day content calendar', 'Basic', 'Advanced'],
              ['Priority AI (faster models)', false, true],
              ['Bulk export (Markdown/JSON)', false, true],
              ['Early access to new tools', false, true],
              ['Priority WhatsApp support', false, true],
            ].map(([label, free, prem]) => (
              <tr key={label} className="border-b border-slate-100 last:border-0 dark:border-ink-800">
                <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">{label}</td>
                {[free, prem].map((v, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {v === true ? <Check size={16} className={`mx-auto ${i ? 'text-emerald-500' : 'text-slate-400'}`} />
                      : v === false ? <Minus size={15} className="mx-auto text-slate-300 dark:text-ink-600" />
                      : <span className={`text-xs font-bold ${i ? 'text-brand-500' : 'text-slate-500 dark:text-slate-400'}`}>{v}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
