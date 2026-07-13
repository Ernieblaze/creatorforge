/**
 * Billing — Paystack subscriptions for Premium (₦3,000/mo · ₦30,000/yr).
 *
 * Flow: inline checkout (plan codes from env) → onSuccess we call the
 * paystack-verify edge function, which confirms the charge server-side
 * and flips the profile to premium. The paystack-webhook function keeps
 * everything in sync afterwards (renewals, failures, cancellations).
 *
 * Demo mode (no Paystack/Supabase config): checkout is simulated so the
 * upgrade flow stays explorable.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { upsertProfile } from './db'

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
const PLAN_CODES = {
  monthly: import.meta.env.VITE_PAYSTACK_PLAN_MONTHLY || '',
  yearly: import.meta.env.VITE_PAYSTACK_PLAN_YEARLY || '',
}

export const isPaystackConfigured = () =>
  Boolean(PAYSTACK_PUBLIC_KEY && isSupabaseConfigured)

/* ── Inline script loader (js.paystack.co, loaded on demand) ── */
let paystackReady = null
function loadPaystack() {
  if (window.PaystackPop) return Promise.resolve()
  if (paystackReady) return paystackReady
  paystackReady = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.paystack.co/v2/inline.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Paystack — check your connection.'))
    document.head.appendChild(s)
  })
  return paystackReady
}

/**
 * Open checkout for 'monthly' | 'yearly'. Resolves with
 * { status: 'success' } once payment is verified server-side,
 * { status: 'cancelled' } if the user closes the popup.
 */
export async function startCheckout({ user, interval }) {
  // Demo path: simulate a successful upgrade locally
  if (!isPaystackConfigured()) {
    await new Promise((r) => setTimeout(r, 1200))
    await upsertProfile(user.id, { plan: 'premium' })
    return { status: 'success', demo: true }
  }

  const plan = PLAN_CODES[interval]
  if (!plan) throw new Error(`Missing Paystack plan code for ${interval} — set VITE_PAYSTACK_PLAN_${interval.toUpperCase()} in .env.`)

  await loadPaystack()
  return new Promise((resolve, reject) => {
    const popup = new window.PaystackPop()
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY,
      email: user.email,
      plan, // amount + recurrence come from the Paystack plan
      metadata: { user_id: user.id, interval },
      onSuccess: async (txn) => {
        try {
          await verifyPayment(txn.reference)
          resolve({ status: 'success', reference: txn.reference })
        } catch (e) {
          reject(e)
        }
      },
      onCancel: () => resolve({ status: 'cancelled' }),
      onError: (e) => reject(new Error(e?.message || 'Payment failed — please try again.')),
    })
  })
}

/** Server-side verification → activates premium instantly. */
export async function verifyPayment(reference) {
  const { data, error } = await supabase.functions.invoke('paystack-verify', {
    body: { reference },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch { /* keep generic */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** Cancel auto-renewal (access continues until the paid period ends). */
export async function cancelSubscription() {
  if (!isPaystackConfigured()) {
    // Demo: downgrade immediately
    return { ok: true, demo: true, message: 'Demo subscription cancelled.' }
  }
  const { data, error } = await supabase.functions.invoke('paystack-manage', {
    body: { action: 'cancel' },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json()
      if (body?.error) message = body.error
    } catch { /* keep generic */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** Paystack-hosted page to update the payment card. */
export async function getManageLink() {
  const { data, error } = await supabase.functions.invoke('paystack-manage', {
    body: { action: 'link' },
  })
  if (error || data?.error) throw new Error(data?.error || error.message)
  return data.link
}

/** The caller's latest subscription row (RLS: own rows only). */
export async function getMySubscription(userId) {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('subscriptions')
    .select('interval, status, amount_kobo, started_at, expires_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
