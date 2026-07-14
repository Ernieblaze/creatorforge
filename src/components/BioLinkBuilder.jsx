import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Trash2, Sparkles, Globe, Copy, Crown, ExternalLink,
  Camera, Video, AtSign, Music2, MessageCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { generate } from '../lib/ai'
import { getTool } from '../lib/tools'
import { getMyBioPage, saveBioPage, saveGeneration } from '../lib/db'
import { Spinner } from './ui'
import { useToast } from './toast'

/* ── Themes shared by the editor preview and the public page ── */
export const BIO_THEMES = {
  dark: {
    label: 'Dark',
    page: 'bg-[#0b0d14] text-white',
    button: 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
    sub: 'text-slate-400',
  },
  brand: {
    label: 'Brand',
    page: 'bg-gradient-to-b from-indigo-950 via-[#1a1040] to-fuchsia-950 text-white',
    button: 'bg-white/12 text-white hover:bg-white/25 border border-white/15',
    sub: 'text-indigo-200/80',
  },
  light: {
    label: 'Light',
    page: 'bg-slate-50 text-slate-900',
    button: 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-sm',
    sub: 'text-slate-500',
  },
  sunset: {
    label: 'Sunset',
    page: 'bg-gradient-to-b from-amber-500 via-rose-500 to-purple-700 text-white',
    button: 'bg-black/25 text-white hover:bg-black/40 border border-white/20',
    sub: 'text-white/80',
  },
}

export const SOCIAL_ICONS = {
  instagram: Camera,
  tiktok: Music2,
  x: AtSign,
  youtube: Video,
  whatsapp: MessageCircle,
}

const FREE_LINK_LIMIT = 3

/** The rendered bio card — used by the live preview AND the public page. */
export function BioCard({ page, compact = false }) {
  const t = BIO_THEMES[page.theme] || BIO_THEMES.dark
  const socials = Object.entries(page.socials || {}).filter(([, url]) => url)
  return (
    <div className={`flex min-h-full w-full flex-col items-center px-6 ${compact ? 'py-8' : 'py-14'} ${t.page}`}>
      {page.avatar_url ? (
        <img src={page.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white/30" />
      ) : (
        <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-extrabold text-white">
          {(page.name || '?')[0]?.toUpperCase()}
        </span>
      )}
      <h1 className="mt-4 text-lg font-extrabold">{page.name || 'Your name'}</h1>
      {page.bio && <p className={`mt-1.5 max-w-xs text-center text-sm leading-relaxed ${t.sub}`}>{page.bio}</p>}

      {socials.length > 0 && (
        <div className="mt-4 flex gap-3">
          {socials.map(([key, url]) => {
            const Icon = SOCIAL_ICONS[key]
            return (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                 className={`grid h-9 w-9 place-items-center rounded-full transition-transform hover:scale-110 ${t.button}`}>
                <Icon size={16} />
              </a>
            )
          })}
        </div>
      )}

      <div className="mt-6 w-full max-w-sm space-y-3">
        {(page.links || []).filter((l) => l.title).map((l, i) => (
          <a
            key={i}
            href={l.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`block w-full rounded-2xl px-5 py-3.5 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 ${t.button}`}
          >
            {l.title}
          </a>
        ))}
        {(page.links || []).filter((l) => l.title).length === 0 && (
          <p className={`text-center text-xs ${t.sub}`}>Your links will appear here</p>
        )}
      </div>

      {page.show_badge !== false && (
        <a href="/" className={`mt-auto pt-10 text-[11px] font-semibold ${t.sub} hover:underline`}>
          ⚡ Made with CreatorForge
        </a>
      )}
    </div>
  )
}

/* ══════════════════ The builder (in-app tool) ══════════════════ */
export default function BioLinkBuilder() {
  const { user, profile, plan } = useAuth()
  const toast = useToast()
  const tool = getTool('bio-link')
  const [page, setPage] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState('')

  useEffect(() => {
    if (!user) return
    getMyBioPage(user.id).then((existing) => {
      if (existing) {
        setPage(existing)
        setPublishedSlug(existing.slug)
      } else {
        setPage({
          slug: (profile?.username || user.email?.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_]/g, ''),
          name: user.user_metadata?.full_name || profile?.username || '',
          bio: profile?.bio || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          links: [{ title: '', url: '' }],
          socials: {},
          theme: 'dark',
        })
      }
    })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!page) {
    return <div className="grid min-h-64 place-items-center"><Spinner size={26} className="text-brand-500" /></div>
  }

  const set = (k, v) => setPage((p) => ({ ...p, [k]: v }))
  const setLink = (i, k, v) =>
    setPage((p) => ({ ...p, links: p.links.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)) }))
  const addLink = () => {
    if (plan === 'free' && page.links.length >= FREE_LINK_LIMIT) {
      toast(`Free plan includes ${FREE_LINK_LIMIT} links — go Premium for unlimited`, 'info')
      return
    }
    setPage((p) => ({ ...p, links: [...p.links, { title: '', url: '' }] }))
  }
  const removeLink = (i) => setPage((p) => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }))

  async function aiGenerate() {
    if (generating) return
    setGenerating(true)
    try {
      const text = await generate({
        system: tool.system,
        messages: [{
          role: 'user',
          content: `Creator: ${page.name || 'a creator'}. Niche: ${profile?.niche || 'general content'}. Goal: ${profile?.goal || 'grow their audience'}. Current bio: "${page.bio || 'none'}". Write the JSON.`,
        }],
        tool: 'bio-link',
      })
      const data = JSON.parse(text.replace(/^```(json)?|```$/gm, '').trim())
      setPage((p) => {
        const links = [...p.links]
        // Fill empty link titles with AI suggestions (never overwrite user text)
        let s = 0
        for (let i = 0; i < links.length && s < (data.link_titles?.length || 0); i++) {
          if (!links[i].title) links[i] = { ...links[i], title: data.link_titles[s++] }
        }
        return { ...p, bio: data.bio || p.bio, links }
      })
      await saveGeneration({ userId: user.id, tool: 'bio-link', title: `Bio for @${page.slug}`, input: profile?.niche || '', output: data.bio, credits: 1 })
      toast('✨ Bio written for your niche')
    } catch {
      toast('Could not generate right now — try again', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function publish() {
    if (publishing) return
    setPublishing(true)
    try {
      const saved = await saveBioPage(user.id, { ...page, show_badge: plan !== 'premium' })
      setPublishedSlug(saved.slug)
      await navigator.clipboard.writeText(`${window.location.origin}/u/${saved.slug}`).catch(() => {})
      toast('🚀 Published! Link copied — paste it in your Instagram/TikTok bio')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* ── Editor ── */}
      <div className="card space-y-5 self-start p-5 lg:col-span-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Page username</label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">/u/</span>
              <input className="input-base" value={page.slug}
                     onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                     placeholder="yourname" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Display name</label>
            <input className="input-base" value={page.name} onChange={(e) => set('name', e.target.value)} placeholder="Ernie Blaze" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Profile photo URL</label>
          <input className="input-base" value={page.avatar_url} onChange={(e) => set('avatar_url', e.target.value)} placeholder="https://… (your Google photo is used by default)" />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Bio</label>
            <button onClick={aiGenerate} disabled={generating} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-500 transition-colors hover:bg-brand-500/20">
              {generating ? <Spinner size={13} /> : <Sparkles size={13} />} Generate Bio & Layout · 1 cr
            </button>
          </div>
          <textarea rows={2} className="input-base resize-y" value={page.bio} onChange={(e) => set('bio', e.target.value)} placeholder="One magnetic line about what you create" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Links {plan === 'free' && <span className="font-normal text-slate-400">({page.links.length}/{FREE_LINK_LIMIT} on free)</span>}
          </label>
          <div className="space-y-2.5">
            {page.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input className="input-base flex-1" value={l.title} onChange={(e) => setLink(i, 'title', e.target.value)} placeholder="Button label — e.g. 🔥 My YouTube" />
                <input className="input-base flex-1" value={l.url} onChange={(e) => setLink(i, 'url', e.target.value)} placeholder="https://…" />
                <button onClick={() => removeLink(i)} aria-label="Remove link" className="grid h-11 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:text-rose-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addLink} className="btn-secondary mt-2.5 !px-3.5 !py-2 text-xs">
            <Plus size={14} /> Add link
            {plan === 'free' && page.links.length >= FREE_LINK_LIMIT && <Crown size={12} className="text-amber-400" />}
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Social icons</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.keys(SOCIAL_ICONS).map((key) => (
              <input key={key} className="input-base text-xs" value={page.socials?.[key] || ''}
                     onChange={(e) => set('socials', { ...page.socials, [key]: e.target.value })}
                     placeholder={`${key.charAt(0).toUpperCase() + key.slice(1)} URL`} />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Theme</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(BIO_THEMES).map(([key, t]) => (
              <button key={key} onClick={() => set('theme', key)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        page.theme === key
                          ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                          : 'border-slate-300 text-slate-500 dark:border-ink-600 dark:text-slate-400'
                      }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={publish} disabled={publishing || !page.slug} className="btn-primary w-full !py-3">
          {publishing ? <><Spinner size={16} /> Publishing…</> : <><Globe size={16} /> Publish my page</>}
        </button>

        {publishedSlug && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Live: {window.location.origin}/u/{publishedSlug}
            </span>
            <span className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/u/${publishedSlug}`); toast('Link copied') }}
                      className="btn-secondary !px-3 !py-1.5 text-xs"><Copy size={12} /> Copy</button>
              <Link to={`/u/${publishedSlug}`} target="_blank" className="btn-secondary !px-3 !py-1.5 text-xs">
                <ExternalLink size={12} /> View
              </Link>
            </span>
          </div>
        )}
      </div>

      {/* ── Live preview ── */}
      <div className="lg:col-span-2">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Live preview</p>
        <motion.div layout className="mx-auto max-w-70 overflow-hidden rounded-[2rem] border-4 border-slate-300 shadow-2xl dark:border-ink-600">
          <div className="h-130 overflow-y-auto">
            <BioCard page={{ ...page, show_badge: plan !== 'premium' }} compact />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
