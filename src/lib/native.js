/**
 * Native (Android app) helpers. On the plain website every export here is a
 * safe no-op — `isNative` is false and nothing runs.
 *
 * Google sign-in inside the app can't use a plain redirect (the session would
 * land in the WebView's origin and never return to the app). Instead we:
 *   1. ask Supabase for the OAuth URL (skipBrowserRedirect) — this also stores
 *      the PKCE code_verifier in the WebView's localStorage;
 *   2. open that URL in a system Custom Tab (Google allows Custom Tabs, unlike
 *      WebViews), so the user signs in in a real browser;
 *   3. Supabase redirects to our deep link (app.creatorforge.mobile://auth),
 *      which the OS routes back into the app as an `appUrlOpen` event;
 *   4. we exchange the returned `?code=` for a session — the code_verifier from
 *      step 1 is still in the same WebView, so this succeeds and the user is in.
 */
import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

// Custom URL scheme registered in AndroidManifest.xml. Must match the
// redirect URL added to Supabase → Auth → URL Configuration → Redirect URLs.
export const AUTH_REDIRECT = 'app.creatorforge.mobile://auth'

/** Start Google sign-in from inside the app (Custom Tab + deep-link return). */
export async function signInWithGoogleNative(supabase) {
  const { Browser } = await import('@capacitor/browser')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
  })
  if (error) throw error
  if (data?.url) await Browser.open({ url: data.url })
}

let bound = false
/**
 * Register the deep-link listener once. When Supabase bounces back to our
 * scheme, close the browser and complete the session exchange. `onSignedIn`
 * fires after a successful exchange (onAuthStateChange also fires).
 */
export async function initNativeAuth(supabase, onSignedIn) {
  if (!isNative || bound || !supabase) return
  bound = true
  const { App } = await import('@capacitor/app')
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || !url.startsWith('app.creatorforge.mobile://')) return
    const query = url.includes('?') ? url.split('?')[1] : ''
    const params = new URLSearchParams(query)
    const code = params.get('code')
    const authError = params.get('error_description') || params.get('error')
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.close().catch(() => {})
    } catch { /* browser may already be closed */ }
    if (authError) {
      console.warn('Auth deep link error:', authError)
      return
    }
    if (!code) return
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) onSignedIn?.()
    else console.error('exchangeCodeForSession failed:', error.message)
  })
}

/**
 * Register for push notifications and save the device's FCM token.
 * Inert until the app is built with the PushNotifications native plugin +
 * Firebase config — `isPluginAvailable` is false without them, so nothing
 * runs (no permission prompt, no error) on builds that don't have push yet.
 */
let pushBound = false
export async function initNativePush(supabase, userId) {
  if (!isNative || pushBound || !supabase || !userId) return
  if (!Capacitor.isPluginAvailable('PushNotifications')) return
  pushBound = true
  const { PushNotifications } = await import('@capacitor/push-notifications')

  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return

  PushNotifications.addListener('registration', async ({ value }) => {
    await supabase.rpc('save_device_token', { p_token: value, p_platform: 'android' })
  })
  PushNotifications.addListener('registrationError', (e) => {
    console.warn('Push registration error:', e?.error)
  })
  // Tapping a notification can carry a { path } to open a specific page.
  PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const path = notification?.data?.path
    if (path && typeof path === 'string' && path.startsWith('/')) {
      window.location.assign(path)
    }
  })
  await PushNotifications.register()
}
