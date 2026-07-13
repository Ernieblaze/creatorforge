import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured, isAdminEmail } from '../lib/supabase'
import { getProfile, upsertProfile } from '../lib/db'

/**
 * Auth context. With Supabase configured it uses Google OAuth; without it,
 * a local "demo session" is created so the whole product can be explored.
 */
const AuthContext = createContext(null)

const DEMO_USER_KEY = 'cf_demo_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u) => {
    if (!u) return setProfile(null)
    let p = await getProfile(u.id)
    if (!p) p = await upsertProfile(u.id, { email: u.email, plan: 'free' })
    setProfile(p)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const demo = JSON.parse(localStorage.getItem(DEMO_USER_KEY) || 'null')
      setUser(demo)
      loadProfile(demo).finally(() => setLoading(false))
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user)
    })
    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/app` },
      })
      return
    }
    // Demo mode: local fake session
    const demo = {
      id: 'demo-user',
      email: 'demo@creatorforge.app',
      user_metadata: { full_name: 'Demo Creator', avatar_url: '' },
    }
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo))
    setUser(demo)
    await loadProfile(demo)
  }

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut()
    localStorage.removeItem(DEMO_USER_KEY)
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = () => loadProfile(user)

  // Effective plan: a premium whose premium_until has lapsed (e.g. after
  // cancellation) is treated as free — mirrors the server-side trigger.
  const rawPlan = profile?.plan || 'free'
  const lapsed =
    rawPlan === 'premium' &&
    profile?.premium_until &&
    new Date(profile.premium_until) < new Date()

  const value = {
    user,
    profile,
    loading,
    isAdmin: isAdminEmail(user?.email) || (!isSupabaseConfigured && Boolean(user)),
    plan: lapsed ? 'free' : rawPlan,
    signInWithGoogle,
    signOut,
    refreshProfile,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
