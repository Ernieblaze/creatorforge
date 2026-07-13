/**
 * Announcements — backed by the Supabase `announcements` table with a
 * realtime subscription so every connected user sees new banners
 * instantly. Demo mode (no Supabase keys) falls back to localStorage.
 */
import { supabase, isSupabaseConfigured } from './supabase'

const LS_CURRENT = 'cf_announcement'
const LS_HISTORY = 'cf_announcement_history'

/** Latest active announcement or null. */
export async function getActiveAnnouncement() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem(LS_CURRENT) || 'null')
  }
  const { data } = await supabase
    .from('announcements')
    .select('id, text, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { id: data.id, text: data.text, at: new Date(data.created_at).getTime() } : null
}

/**
 * Subscribe to announcement changes. `cb` receives the latest active
 * announcement (or null) whenever anything changes. Returns unsubscribe.
 */
export function subscribeAnnouncements(cb) {
  if (!isSupabaseConfigured) {
    // Demo: react to other tabs via the storage event
    const handler = (e) => { if (e.key === LS_CURRENT) cb(JSON.parse(e.newValue || 'null')) }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
  const channel = supabase
    .channel('announcements-feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      () => getActiveAnnouncement().then(cb)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/** Publish: deactivate previous banners, insert the new one. Admin-only (RLS). */
export async function publishAnnouncement(text, userId) {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!isSupabaseConfigured) {
    const ann = { id: crypto.randomUUID(), text: trimmed, at: Date.now() }
    localStorage.setItem(LS_CURRENT, JSON.stringify(ann))
    const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
    localStorage.setItem(LS_HISTORY, JSON.stringify([ann, ...history.filter((h) => h.text !== trimmed)].slice(0, 20)))
    return ann
  }
  await supabase.from('announcements').update({ active: false }).eq('active', true)
  const { data, error } = await supabase
    .from('announcements')
    .insert({ text: trimmed, active: true, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, text: data.text, at: new Date(data.created_at).getTime() }
}

/** Retract the currently live banner. */
export async function retractAnnouncement() {
  if (!isSupabaseConfigured) {
    localStorage.removeItem(LS_CURRENT)
    return
  }
  await supabase.from('announcements').update({ active: false }).eq('active', true)
}

/** Recent announcements (for the admin history list). */
export async function listAnnouncements(limit = 20) {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
  }
  const { data } = await supabase
    .from('announcements')
    .select('id, text, active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((a) => ({ id: a.id, text: a.text, active: a.active, at: new Date(a.created_at).getTime() }))
}

/** Delete one announcement from history. */
export async function deleteAnnouncement(idOrAt) {
  if (!isSupabaseConfigured) {
    const history = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]')
    localStorage.setItem(LS_HISTORY, JSON.stringify(history.filter((h) => h.at !== idOrAt && h.id !== idOrAt)))
    return
  }
  await supabase.from('announcements').delete().eq('id', idOrAt)
}
