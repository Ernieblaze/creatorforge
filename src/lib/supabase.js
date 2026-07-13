import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client. When env vars are missing the app runs in "demo mode":
 * auth is simulated locally and content is stored in localStorage, so the
 * whole product can be explored before any keys are configured.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null

/**
 * Emails that unlock the admin dashboard. Reads both VITE_ADMIN_EMAIL
 * (single) and VITE_ADMIN_EMAILS (comma-separated) so either works.
 */
export function getAdminEmails() {
  return [import.meta.env.VITE_ADMIN_EMAIL || '', ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase()))
}
