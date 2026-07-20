import { useEffect, useState } from 'react'
import { Megaphone, Check, Trash2, X, Radio, Bell } from 'lucide-react'
import {
  getActiveAnnouncement, publishAnnouncement, retractAnnouncement,
  listAnnouncements, deleteAnnouncement,
} from '../../lib/announcements'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { SectionHeader } from './shared'
import { Spinner } from '../../components/ui'
import { useToast } from '../../components/toast'

/** Compose and send a push notification to every registered device. */
function PushComposer() {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!title.trim() || !body.trim() || busy) return
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { title: title.trim(), body: body.trim() },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast(`Push sent to ${data?.sent ?? 0} device${data?.sent === 1 ? '' : 's'}`)
      setTitle(''); setBody('')
    } catch (e) {
      toast(e.message || 'Push failed — is the send-push function deployed?', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
        <Bell size={17} className="text-accent-500" /> Send push notification
      </h2>
      <p className="mb-3 text-xs text-slate-400">Goes to every phone with the app installed — even when the app is closed.</p>
      <input
        className="input-base mb-2"
        placeholder="Title — e.g. 🔥 Your credits are fresh"
        value={title}
        maxLength={65}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        rows={2}
        className="input-base resize-y"
        placeholder="Message — e.g. Come create something today. 5 free credits are waiting."
        value={body}
        maxLength={180}
        onChange={(e) => setBody(e.target.value)}
      />
      <button onClick={send} disabled={!title.trim() || !body.trim() || busy} className="btn-primary mt-3 !py-2.5 text-sm">
        {busy ? <Spinner size={15} /> : <Bell size={15} />} Send to all devices
      </button>
    </section>
  )
}

/**
 * Publish dismissible banners shown to all users. Backed by the Supabase
 * `announcements` table with realtime delivery (localStorage in demo mode).
 */
export default function AnnouncementsSection() {
  const { user } = useAuth()
  const toast = useToast()
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(false)

  async function refresh() {
    setCurrent(await getActiveAnnouncement())
    setHistory(await listAnnouncements())
  }
  useEffect(() => { refresh() }, [])

  async function publish(t = text) {
    if (!t.trim() || busy) return
    setBusy(true)
    try {
      await publishAnnouncement(t, user.id)
      setText('')
      setFlash(true)
      setTimeout(() => setFlash(false), 1800)
      toast('Announcement published to all users')
      await refresh()
    } catch (e) {
      toast(e.message || 'Publish failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function retract() {
    setBusy(true)
    try {
      await retractAnnouncement()
      toast('Banner retracted')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id) {
    await deleteAnnouncement(id)
    await refresh()
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Announcements"
        subtitle={
          isSupabaseConfigured
            ? 'Delivered instantly to every connected user via Supabase realtime.'
            : 'Demo mode: stored locally — connect Supabase for instant delivery to all users.'
        }
      />

      {/* Composer */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Megaphone size={17} className="text-brand-400" /> New announcement
        </h2>
        <textarea
          rows={3}
          className="input-base resize-y"
          placeholder='e.g. 🎉 New tool alert: the Competitor Analyzer just dropped — try it from the sidebar!'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => publish()} disabled={!text.trim() || busy} className="btn-primary !py-2.5 text-sm">
            {busy ? <Spinner size={15} /> : flash ? <><Check size={15} /> Published</> : 'Publish to all users'}
          </button>
          <p className="text-xs text-slate-400">Publishing replaces the current banner.</p>
        </div>
      </section>

      {/* Push notification composer */}
      {isSupabaseConfigured && <PushComposer />}

      {/* Live banner */}
      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Radio size={16} className="text-emerald-500" /> Currently live
        </h2>
        {current ? (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-accent-500/10 px-4 py-3">
            <p className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
              <Megaphone size={16} className="mt-0.5 shrink-0 text-brand-500" /> {current.text}
            </p>
            <button onClick={retract} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300/60 px-3 py-1.5 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 dark:border-rose-500/40">
              <X size={13} /> Retract
            </button>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">No banner is live right now.</p>
        )}
      </section>

      {/* History */}
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-slate-900 dark:text-white">History</h2>
        {history === null ? (
          <div className="grid place-items-center py-8"><Spinner size={20} className="text-brand-500" /></div>
        ) : history.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nothing published yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id || h.at} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-2.5 dark:border-ink-600">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-600 dark:text-slate-300">{h.text}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(h.at).toLocaleString()}
                    {h.active && <span className="ml-2 font-bold text-emerald-500">LIVE</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!h.active && (
                    <button onClick={() => publish(h.text)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400">
                      Re-publish
                    </button>
                  )}
                  <button onClick={() => remove(h.id || h.at)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-ink-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
