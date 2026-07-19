/**
 * Partner (real-money affiliate) program — client helpers.
 * All balances travel as kobo; format with `nairaFromKobo` at render.
 * Requires Supabase (no demo-mode fallback — real money only).
 */
import { supabase, isSupabaseConfigured } from './supabase'

export const partnersAvailable = isSupabaseConfigured

export const nairaFromKobo = (kobo) => `₦${(Number(kobo || 0) / 100).toLocaleString()}`

/* ── Partner side ────────────────────────────────────────── */

export async function getMyPartner(userId) {
  if (!partnersAvailable) return null
  const { data } = await supabase.from('partners').select('*').eq('user_id', userId).maybeSingle()
  return data
}

export async function applyAsPartner(userId, { promo_plan, audience, bank_name, account_number, account_name }) {
  const { error } = await supabase.from('partners').insert({
    user_id: userId, promo_plan, audience, bank_name, account_number, account_name,
  })
  if (error) throw new Error(error.message)
}

export async function updateBankDetails(userId, { bank_name, account_number, account_name }) {
  const { error } = await supabase.from('partners')
    .update({ bank_name, account_number, account_name }).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

/** { signups, paying, pending_kobo, available_kobo, paid_kobo } */
export async function getPartnerStats() {
  const { data, error } = await supabase.rpc('partner_stats')
  if (error) throw new Error(error.message)
  return data
}

export async function listMyCommissions(userId) {
  const { data } = await supabase.from('partner_commissions')
    .select('*').eq('partner_id', userId).order('created_at', { ascending: false }).limit(100)
  return data ?? []
}

export async function listMyPayouts(userId) {
  const { data } = await supabase.from('partner_payouts')
    .select('*').eq('partner_id', userId).order('requested_at', { ascending: false }).limit(50)
  return data ?? []
}

/** Requests the full available balance. Throws with a readable message. */
export async function requestPayout() {
  const { data, error } = await supabase.rpc('request_payout')
  if (error) throw new Error(error.message)
  return data
}

/* ── Admin side ──────────────────────────────────────────── */
/* Admin RLS lets these read every row; emails come from profiles
   (admins read all profiles) and are merged client-side. */

async function emailMap(ids) {
  if (!ids.length) return {}
  const { data } = await supabase.from('profiles').select('id, email, username').in('id', ids)
  return Object.fromEntries((data ?? []).map((p) => [p.id, p]))
}

export async function adminListPartners() {
  const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false })
  const partners = data ?? []
  const profiles = await emailMap(partners.map((p) => p.user_id))
  return partners.map((p) => ({ ...p, profile: profiles[p.user_id] }))
}

export async function adminSetPartner(userId, fields) {
  const patch = { ...fields }
  if (fields.status === 'approved') patch.approved_at = new Date().toISOString()
  const { error } = await supabase.from('partners').update(patch).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function adminListPayouts() {
  const { data } = await supabase.from('partner_payouts')
    .select('*').order('requested_at', { ascending: false }).limit(200)
  const payouts = data ?? []
  const partnerIds = [...new Set(payouts.map((p) => p.partner_id))]
  if (!partnerIds.length) return []
  const { data: partners } = await supabase.from('partners').select('*').in('user_id', partnerIds)
  const profiles = await emailMap(partnerIds)
  const byId = Object.fromEntries((partners ?? []).map((p) => [p.user_id, p]))
  return payouts.map((p) => ({ ...p, partner: byId[p.partner_id], profile: profiles[p.partner_id] }))
}

export async function adminResolvePayout(payoutId, action, note) {
  const { error } = await supabase.rpc('resolve_payout', { p_id: payoutId, p_action: action, p_note: note ?? null })
  if (error) throw new Error(error.message)
}

export async function adminListCommissions() {
  const { data } = await supabase.from('partner_commissions')
    .select('*').order('created_at', { ascending: false }).limit(200)
  const rows = data ?? []
  const ids = [...new Set(rows.flatMap((r) => [r.partner_id, r.referred_user]).filter(Boolean))]
  const profiles = await emailMap(ids)
  return rows.map((r) => ({
    ...r,
    partnerProfile: profiles[r.partner_id],
    referredProfile: profiles[r.referred_user],
  }))
}
