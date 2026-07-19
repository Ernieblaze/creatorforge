/**
 * Data layer: content history, profiles, freemium limits.
 * Every function works against Supabase when configured, and transparently
 * falls back to localStorage in demo mode so the app is fully usable
 * before any backend exists.
 */
import { supabase, isSupabaseConfigured } from './supabase'

const LS_CONTENT = 'cf_content'
const LS_PROFILE = 'cf_profile'
const LS_USAGE = 'cf_daily_usage'

// Daily credit budgets. Basic generation = 1 credit, Advanced = 2.
export const CREDIT_COST = { basic: 1, advanced: 2 }
export const FREE_DAILY_CREDITS = 5
export const PREMIUM_DAILY_CREDITS = 50 // "unlimited" fair-use safety cap
export const PLANS = {
  free: { name: 'Free', dailyCredits: FREE_DAILY_CREDITS, price: 0 },
  premium: { name: 'Premium', dailyCredits: PREMIUM_DAILY_CREDITS, price: 3000 },
}
// Back-compat alias (some UI still reads a flat number)
export const FREE_DAILY_LIMIT = FREE_DAILY_CREDITS

/* ── Profile ─────────────────────────────────────────────── */
export async function getProfile(userId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  }
  return JSON.parse(localStorage.getItem(LS_PROFILE) || 'null')
}

export async function upsertProfile(userId, patch) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const current = JSON.parse(localStorage.getItem(LS_PROFILE) || '{}')
  const next = { id: userId, plan: 'free', ...current, ...patch }
  localStorage.setItem(LS_PROFILE, JSON.stringify(next))
  return next
}

/* ── Freemium limits ─────────────────────────────────────── */
const todayKey = () => new Date().toISOString().slice(0, 10)

/**
 * Returns today's credit usage: { used, limit, remaining, allowed }.
 * Sums the `credits` column; if that column isn't migrated yet it falls
 * back to counting rows (each = 1 credit) so nothing breaks mid-upgrade.
 */
export async function getUsageToday(userId, plan = 'free') {
  const limit = PLANS[plan]?.dailyCredits ?? FREE_DAILY_CREDITS
  let used = 0
  if (isSupabaseConfigured) {
    // The server enforces limits from ai_usage (its own ledger — counts
    // EVERY AI call, including strategist chats). Read both that ledger
    // and generations and take the higher: if the ai_usage own-read
    // policy isn't applied yet, RLS silently returns [] and generations
    // keeps the count honest.
    const since = `${todayKey()}T00:00:00Z`
    const [{ data: ledger }, { data: gens, error: gensErr }] = await Promise.all([
      supabase.from('ai_usage').select('credits').eq('user_id', userId).gte('created_at', since),
      supabase.from('generations').select('credits').eq('user_id', userId).gte('created_at', since),
    ])
    const sum = (rows) => (rows ?? []).reduce((s, r) => s + (r.credits ?? 1), 0)
    let genUsed = sum(gens)
    if (gensErr) {
      // `credits` column not migrated — fall back to a row count
      const { count } = await supabase
        .from('generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since)
      genUsed = count ?? 0
    }
    used = Math.max(sum(ledger), genUsed)
  } else {
    const u = JSON.parse(localStorage.getItem(LS_USAGE) || '{}')
    used = u.date === todayKey() ? u.credits : 0
  }
  return { used, limit, remaining: Math.max(0, limit - used), allowed: used < limit }
}

function bumpLocalUsage(credits = 1) {
  const u = JSON.parse(localStorage.getItem(LS_USAGE) || '{}')
  const prev = u.date === todayKey() ? u.credits : 0
  localStorage.setItem(LS_USAGE, JSON.stringify({ date: todayKey(), credits: prev + credits }))
}

/* ── Referrals ───────────────────────────────────────────── */
/**
 * Apply a pending referral (from localStorage 'cf_ref') for the signed-in
 * user. Server-side RPC validates everything: one referral per account,
 * no self-referral, both sides get +5 bonus credits. Returns true when
 * the bonus was granted.
 */
export async function applyPendingReferral(userId) {
  const ref = localStorage.getItem('cf_ref')
  if (!ref) return false
  if (!isSupabaseConfigured || ref === userId) {
    localStorage.removeItem('cf_ref')
    return false
  }
  const { data, error } = await supabase.rpc('apply_referral', { referrer: ref })
  localStorage.removeItem('cf_ref') // one attempt only, success or not
  return !error && data === true
}

/* ── Link-in-Bio pages ───────────────────────────────────── */
const LS_BIO = 'cf_bio_page'

/** Public fetch by slug — powers /u/:username for visitors (no login). */
export async function getBioPage(slug) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('bio_pages').select('*').eq('slug', slug.toLowerCase()).maybeSingle()
    return data
  }
  const local = JSON.parse(localStorage.getItem(LS_BIO) || 'null')
  return local?.slug === slug.toLowerCase() ? local : null
}

/** The signed-in user's own bio page (or null). */
export async function getMyBioPage(userId) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('bio_pages').select('*').eq('user_id', userId).maybeSingle()
    return data
  }
  return JSON.parse(localStorage.getItem(LS_BIO) || 'null')
}

/** Create/update the user's bio page. Throws 'SLUG_TAKEN' on collisions. */
export async function saveBioPage(userId, page) {
  const row = {
    user_id: userId,
    slug: (page.slug || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30),
    name: page.name || '',
    bio: page.bio || '',
    avatar_url: page.avatar_url || '',
    links: page.links || [],
    socials: page.socials || {},
    theme: page.theme || 'dark',
    updated_at: new Date().toISOString(),
  }
  if (!row.slug) throw new Error('Pick a username for your page link first.')
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('bio_pages').upsert(row, { onConflict: 'user_id' }).select().single()
    if (error) {
      if (/duplicate|unique/i.test(error.message)) throw new Error('That username is taken — try another.')
      throw error
    }
    return data
  }
  localStorage.setItem(LS_BIO, JSON.stringify(row))
  return row
}

/* ── Content history ─────────────────────────────────────── */
export async function saveGeneration({ userId, tool, title, input, output, credits = 1 }) {
  const row = {
    user_id: userId,
    tool,
    title: (title || input || '').slice(0, 120),
    input,
    output,
    credits,
    created_at: new Date().toISOString(),
  }
  if (isSupabaseConfigured) {
    let res = await supabase.from('generations').insert(row).select().single()
    // If the `credits` column isn't migrated yet, retry without it
    if (res.error && /credits/i.test(res.error.message || '')) {
      const { credits: _drop, ...noCredits } = row
      res = await supabase.from('generations').insert(noCredits).select().single()
    }
    if (res.error) throw res.error
    return res.data
  }
  bumpLocalUsage(credits)
  const list = JSON.parse(localStorage.getItem(LS_CONTENT) || '[]')
  const withId = { id: crypto.randomUUID(), ...row }
  list.unshift(withId)
  localStorage.setItem(LS_CONTENT, JSON.stringify(list.slice(0, 200)))
  return withId
}

export async function listGenerations(userId, { tool, limit = 50 } = {}) {
  if (isSupabaseConfigured) {
    let q = supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (tool) q = q.eq('tool', tool)
    const { data } = await q
    return data ?? []
  }
  const list = JSON.parse(localStorage.getItem(LS_CONTENT) || '[]')
  return (tool ? list.filter((g) => g.tool === tool) : list).slice(0, limit)
}

export async function deleteGeneration(userId, id) {
  if (isSupabaseConfigured) {
    await supabase.from('generations').delete().eq('id', id).eq('user_id', userId)
    return
  }
  const list = JSON.parse(localStorage.getItem(LS_CONTENT) || '[]')
  localStorage.setItem(LS_CONTENT, JSON.stringify(list.filter((g) => g.id !== id)))
}

/* ── Strategist chat history (cross-device via Supabase) ─── */
const chatKey = (thread) => `cf_chat_${thread}`

/** Load a chat thread ('dock' | 'strategist'), oldest first. */
export async function loadChat(userId, thread) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('thread', thread)
      .order('created_at', { ascending: true })
      .limit(80)
    return (data ?? []).map(({ role, content }) => ({ role, content }))
  }
  return JSON.parse(localStorage.getItem(chatKey(thread)) || '[]')
}

/** Append one message to a thread. */
export async function saveChatMessage(userId, thread, role, content) {
  if (isSupabaseConfigured) {
    await supabase.from('chat_messages').insert({ user_id: userId, thread, role, content })
    return
  }
  const list = JSON.parse(localStorage.getItem(chatKey(thread)) || '[]')
  list.push({ role, content })
  localStorage.setItem(chatKey(thread), JSON.stringify(list.slice(-80)))
}

/** Wipe a thread. */
export async function clearChat(userId, thread) {
  if (isSupabaseConfigured) {
    await supabase.from('chat_messages').delete().eq('user_id', userId).eq('thread', thread)
    return
  }
  localStorage.removeItem(chatKey(thread))
}

/* ── Output feedback (👍/👎) ─────────────────────────────── */
export async function saveFeedback(userId, tool, vote) {
  if (!isSupabaseConfigured) return
  await supabase.from('output_feedback').insert({ user_id: userId, tool, vote })
}

/* ── Simple per-user stats for the dashboard ─────────────── */
export async function getStats(userId) {
  const all = await listGenerations(userId, { limit: 200 })
  const days = new Set(all.map((g) => g.created_at?.slice(0, 10)))
  // streak: consecutive days ending today/yesterday
  let streak = 0
  const d = new Date()
  for (;;) {
    const key = d.toISOString().slice(0, 10)
    if (days.has(key)) { streak++; d.setDate(d.getDate() - 1) }
    else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) { d.setDate(d.getDate() - 1) }
    else break
  }
  const byTool = {}
  all.forEach((g) => { byTool[g.tool] = (byTool[g.tool] || 0) + 1 })
  return { total: all.length, streak, byTool, recent: all.slice(0, 6) }
}
