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

export const FREE_DAILY_LIMIT = 10
export const PLANS = {
  free: { name: 'Free', dailyLimit: FREE_DAILY_LIMIT, price: 0 },
  premium: { name: 'Premium', dailyLimit: Infinity, price: 3000 },
}

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

/** Returns { used, limit, remaining, allowed } for today. */
export async function getUsageToday(userId, plan = 'free') {
  const limit = PLANS[plan]?.dailyLimit ?? FREE_DAILY_LIMIT
  let used = 0
  if (isSupabaseConfigured) {
    const { count } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${todayKey()}T00:00:00Z`)
    used = count ?? 0
  } else {
    const u = JSON.parse(localStorage.getItem(LS_USAGE) || '{}')
    used = u.date === todayKey() ? u.count : 0
  }
  return { used, limit, remaining: Math.max(0, limit - used), allowed: used < limit }
}

function bumpLocalUsage() {
  const u = JSON.parse(localStorage.getItem(LS_USAGE) || '{}')
  const next = u.date === todayKey() ? { date: u.date, count: u.count + 1 } : { date: todayKey(), count: 1 }
  localStorage.setItem(LS_USAGE, JSON.stringify(next))
}

/* ── Content history ─────────────────────────────────────── */
export async function saveGeneration({ userId, tool, title, input, output }) {
  const row = {
    user_id: userId,
    tool,
    title: (title || input || '').slice(0, 120),
    input,
    output,
    created_at: new Date().toISOString(),
  }
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('generations').insert(row).select().single()
    if (error) throw error
    return data
  }
  bumpLocalUsage()
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
