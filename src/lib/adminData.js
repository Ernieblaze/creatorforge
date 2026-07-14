/**
 * Admin data layer. Every function queries Supabase when configured and
 * falls back to deterministic demo data otherwise, so the whole admin
 * dashboard is explorable before the backend is connected.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { getUsageLog } from './ai'
import { TOOLS } from './tools'

/* ── Deterministic pseudo-random for stable demo data ────── */
const seeded = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1

const DEMO_USERS = [
  { id: 'u1', username: 'adaeze_creates', email: 'adaeze@example.com', plan: 'premium', niche: 'Fashion & Style', generations_today: 14, generation_count: 142, last_active: hoursAgo(1) },
  { id: 'u2', username: 'tundetech', email: 'tunde@example.com', plan: 'free', niche: 'Tech & Gadgets', generations_today: 6, generation_count: 38, last_active: hoursAgo(3) },
  { id: 'u3', username: 'blessbakes', email: 'blessing@example.com', plan: 'premium', niche: 'Food & Cooking', generations_today: 9, generation_count: 96, last_active: hoursAgo(5) },
  { id: 'u4', username: 'chidihustles', email: 'chidi@example.com', plan: 'free', niche: 'Business & Hustle', generations_today: 10, generation_count: 12, last_active: hoursAgo(26) },
  { id: 'u5', username: 'fatima.glow', email: 'fatima@example.com', plan: 'premium', niche: 'Beauty & Skincare', generations_today: 3, generation_count: 210, last_active: hoursAgo(0.4) },
  { id: 'u6', username: 'emeka_eats', email: 'emeka@example.com', plan: 'free', niche: 'Food & Cooking', generations_today: 0, generation_count: 7, last_active: hoursAgo(80) },
  { id: 'u7', username: 'kemi.finance', email: 'kemi@example.com', plan: 'premium', niche: 'Personal Finance', generations_today: 11, generation_count: 175, last_active: hoursAgo(9) },
  { id: 'u8', username: 'dele_fit', email: 'dele@example.com', plan: 'free', niche: 'Fitness & Health', generations_today: 4, generation_count: 29, last_active: hoursAgo(50) },
]

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600e3).toISOString()
}

/* ── Users ───────────────────────────────────────────────── */
export async function fetchUsers() {
  if (!isSupabaseConfigured) return DEMO_USERS
  // admin_user_stats view: profile + generation_count + last_active
  const { data, error } = await supabase.from('admin_user_stats').select('*').limit(500)
  if (error || !data) return []
  const today = new Date().toISOString().slice(0, 10)
  // generations_today needs a second cheap query
  const { data: todays } = await supabase
    .from('generations')
    .select('user_id')
    .gte('created_at', `${today}T00:00:00Z`)
  const counts = {}
  ;(todays || []).forEach((r) => { counts[r.user_id] = (counts[r.user_id] || 0) + 1 })
  return data.map((u) => ({ ...u, generations_today: counts[u.id] || 0 }))
}

export async function fetchUserActivity(userId) {
  if (!isSupabaseConfigured) {
    const i = DEMO_USERS.findIndex((u) => u.id === userId)
    const samples = [
      ['post-generator', 'How I price my products without losing customers'],
      ['viral-score', 'Draft: my story about starting with ₦5k'],
      ['yt-script', '5 mistakes new sellers make'],
      ['repurposer', 'Turning my launch post into a thread'],
      ['calendar', 'Personal brand growth plan'],
      ['strategist', 'Which platform should I double down on?'],
    ]
    return samples.slice(0, 3 + Math.floor(seeded(i + 1) * 3)).map(([tool, title], j) => ({
      id: `${userId}-${j}`, tool, title,
      created_at: hoursAgo(j * 14 + seeded(i + j) * 10),
    }))
  }
  const { data } = await supabase
    .from('generations')
    .select('id, tool, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15)
  return data ?? []
}

/* ── Revenue & subscriptions ─────────────────────────────── */
export async function fetchPayments() {
  if (!isSupabaseConfigured) {
    return DEMO_USERS.filter((u) => u.plan === 'premium').map((u, i) => ({
      id: `pay-${i}`,
      user: u.username,
      email: u.email,
      amount: seeded(i + 3) > 0.7 ? 30000 : 3000,
      interval: seeded(i + 3) > 0.7 ? 'yearly' : 'monthly',
      status: 'active',
      at: hoursAgo(i * 30 + 4),
    }))
  }
  // No FK between subscriptions and profiles (both reference auth.users),
  // so a PostgREST embed fails — fetch separately and merge.
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)
  const subs = data ?? []
  const ids = [...new Set(subs.map((s) => s.user_id))]
  const byId = {}
  if (ids.length) {
    const { data: profs } = await supabase
      .from('profiles').select('id, username, email').in('id', ids)
    for (const p of profs ?? []) byId[p.id] = p
  }
  return subs.map((s) => ({
    id: s.id,
    user: byId[s.user_id]?.username || byId[s.user_id]?.email?.split('@')[0] || '—',
    email: byId[s.user_id]?.email || '—',
    amount: Math.round(s.amount_kobo / 100),
    interval: s.interval,
    status: s.status,
    at: s.started_at,
  }))
}

/** Monthly revenue for the last 6 months (demo synthesizes a growth curve). */
export function monthlyRevenueSeries(payments) {
  const months = []
  const d = new Date()
  d.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    months.push({ key: m.toISOString().slice(0, 7), label: m.toLocaleDateString('en', { month: 'short' }) })
  }
  if (!isSupabaseConfigured) {
    const mrrNow = payments.reduce((s, p) => s + (p.interval === 'monthly' ? p.amount : Math.round(p.amount / 12)), 0)
    return months.map((m, i) => ({ ...m, revenue: Math.round(mrrNow * (0.35 + (i / 5) * 0.65)) }))
  }
  return months.map((m) => ({
    ...m,
    revenue: payments
      .filter((p) => p.at?.slice(0, 7) === m.key && p.status === 'active')
      .reduce((s, p) => s + p.amount, 0),
  }))
}

/* ── AI usage & cost ─────────────────────────────────────── */
/** Daily spend/tokens for the last `days` days from the local usage log. */
export function dailyUsageSeries(days = 14) {
  const log = getUsageLog()
  const byDay = {}
  log.forEach((u) => {
    const key = new Date(u.at).toISOString().slice(0, 10)
    byDay[key] = byDay[key] || { cost: 0, tokens: 0, calls: 0 }
    byDay[key].cost += u.cost || 0
    byDay[key].tokens += (u.inputTokens || 0) + (u.outputTokens || 0)
    byDay[key].calls++
  })
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5)
    const key = d.toISOString().slice(0, 10)
    const demo = !isSupabaseConfigured && !log.length
    out.push({
      key,
      label: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      cost: byDay[key]?.cost ?? (demo ? +(seeded(i + 11) * 0.9 + 0.15).toFixed(3) : 0),
      tokens: byDay[key]?.tokens ?? (demo ? Math.round(seeded(i + 21) * 90e3 + 15e3) : 0),
      calls: byDay[key]?.calls ?? (demo ? Math.round(seeded(i + 31) * 60 + 10) : 0),
    })
  }
  return out
}

export function topUsersByUsage(users) {
  return [...users].sort((a, b) => (b.generation_count || 0) - (a.generation_count || 0)).slice(0, 5)
}

/* ── ai_usage table (written by the generate-content edge fn) ──── */

/** Daily spend/tokens/calls for the last `days` days. Async: reads the
 * ai_usage table when Supabase is live, else the local log/demo series. */
export async function fetchDailyUsage(days = 14) {
  if (!isSupabaseConfigured) return dailyUsageSeries(days)
  const since = new Date(Date.now() - days * 864e5).toISOString()
  const { data } = await supabase
    .from('ai_usage')
    .select('created_at, cost, input_tokens, output_tokens')
    .gte('created_at', since)
    .limit(5000)
  const byDay = {}
  ;(data ?? []).forEach((r) => {
    const key = r.created_at.slice(0, 10)
    byDay[key] = byDay[key] || { cost: 0, tokens: 0, calls: 0 }
    byDay[key].cost += Number(r.cost) || 0
    byDay[key].tokens += (r.input_tokens || 0) + (r.output_tokens || 0)
    byDay[key].calls++
  })
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5)
    const key = d.toISOString().slice(0, 10)
    out.push({
      key,
      label: d.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      cost: byDay[key]?.cost ?? 0,
      tokens: byDay[key]?.tokens ?? 0,
      calls: byDay[key]?.calls ?? 0,
    })
  }
  return out
}

/** Tool usage counts. Async: aggregates ai_usage when Supabase is live. */
export async function fetchToolUsage() {
  if (!isSupabaseConfigured) return toolUsageCounts()
  const { data } = await supabase.from('ai_usage').select('tool').limit(5000)
  const counts = {}
  ;(data ?? []).forEach((r) => { counts[r.tool] = (counts[r.tool] || 0) + 1 })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return entries.length ? entries : toolUsageCounts()
}

/** Recent AI calls for the live feed. */
export async function fetchRecentAiCalls(limit = 40) {
  if (!isSupabaseConfigured) {
    return [...getUsageLog()].reverse().slice(0, limit).map((u) => ({
      tool: u.tool, provider: u.provider,
      tokens: (u.inputTokens || 0) + (u.outputTokens || 0),
      cost: u.cost || 0, at: u.at,
    }))
  }
  const { data } = await supabase
    .from('ai_usage')
    .select('tool, provider, input_tokens, output_tokens, cost, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((r) => ({
    tool: r.tool, provider: r.provider,
    tokens: (r.input_tokens || 0) + (r.output_tokens || 0),
    cost: Number(r.cost) || 0, at: new Date(r.created_at).getTime(),
  }))
}

/** Tool usage counts from the local log (synth in demo mode). */
export function toolUsageCounts() {
  const log = getUsageLog()
  const counts = {}
  log.forEach((u) => { counts[u.tool] = (counts[u.tool] || 0) + 1 })
  if (Object.keys(counts).length) {
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }
  return TOOLS.filter((t) => !t.special || t.special === 'viral' || t.special === 'calendar')
    .map((t, i) => [t.id, Math.round(seeded(i + 7) * 140 + 12)])
    .sort((a, b) => b[1] - a[1])
}

/* ── Global tool feature flags ───────────────────────────── */
/* Demo: localStorage. Production: move to a Supabase `flags` table and
   read it in AppLayout with a realtime subscription. */
const FLAGS_KEY = 'cf_tool_flags'

export function getToolFlags() {
  return JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}')
}

export function isToolEnabled(toolId) {
  return getToolFlags()[toolId] !== false // default: enabled
}

export function setToolFlag(toolId, enabled) {
  const flags = getToolFlags()
  flags[toolId] = enabled
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags))
}

/* ── System logs (Settings section) ──────────────────────── */
export function systemLogs(limit = 60) {
  const usage = getUsageLog().map((u) => ({
    at: u.at,
    kind: 'ai-call',
    detail: `${u.tool} · ${u.provider}/${u.model} · ${(u.inputTokens || 0) + (u.outputTokens || 0)} tok · $${(u.cost || 0).toFixed(5)}`,
  }))
  const ann = JSON.parse(localStorage.getItem('cf_announcement') || 'null')
  const extras = ann ? [{ at: ann.at, kind: 'announcement', detail: `Published: "${ann.text.slice(0, 60)}…"` }] : []
  const logs = [...usage, ...extras].sort((a, b) => b.at - a.at).slice(0, limit)
  if (logs.length) return logs
  return Array.from({ length: 8 }, (_, i) => ({
    at: Date.now() - i * 7200e3,
    kind: ['ai-call', 'auth', 'ai-call', 'system'][i % 4],
    detail: [
      'post-generator · groq/llama-3.3-70b · 1,840 tok · $0.00121',
      'Google sign-in: adaeze@example.com',
      'viral-score · groq/llama-3.3-70b · 990 tok · $0.00067',
      'Daily limit reset completed',
    ][i % 4],
  }))
}
