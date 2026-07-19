import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { generate } from '../lib/ai'
import { getTool } from '../lib/tools'
import { getUsageToday, loadChat, saveChatMessage, clearChat } from '../lib/db'
import { Markdown } from './ui'

/**
 * Persistent AI Strategist: floating button + slide-over chat available on
 * every app page. Conversation persists across devices and sessions via the
 * Supabase `chat_messages` table (localStorage in demo mode), and the system
 * prompt is seeded with the user's niche and goal.
 */
export default function StrategistDock() {
  const { user, plan, profile } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)
  const tool = getTool('strategist')

  useEffect(() => { if (user) loadChat(user.id, 'dock').then(setMessages) }, [user])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading, open])

  // Escape closes the panel
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Hide the dock on the full-page strategist tool to avoid two chats
  if (location.pathname.includes('/tool/strategist')) return null

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const u = await getUsageToday(user.id, plan)
    if (u.remaining + (profile?.bonus_credits ?? 0) < 1) {
      setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '⚠️ You\'ve hit today\'s free limit. Upgrade to Premium for unlimited strategist access.' }])
      setInput('')
      return
    }
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const context = [
        profile?.niche && `The user's niche: ${profile.niche}.`,
        profile?.goal && `Their main goal: ${profile.goal}.`,
      ].filter(Boolean).join(' ')
      const reply = await generate({
        system: `${tool.system} ${context}`,
        messages: next.slice(-12), // keep context light
        tool: 'strategist',
      })
      setMessages([...next, { role: 'assistant', content: reply }])
      await saveChatMessage(user.id, 'dock', 'user', text)
      await saveChatMessage(user.id, 'dock', 'assistant', reply)
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  async function handleClear() {
    setMessages([])
    await clearChat(user.id, 'dock')
  }

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
        onClick={() => setOpen(true)}
        aria-label="Open AI Strategist"
        className={`fixed bottom-24 right-3 z-40 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 p-3 text-white shadow-xl shadow-brand-600/35 transition-transform hover:scale-110 active:scale-95 lg:bottom-6 lg:right-6 lg:h-13 lg:w-13 ${open ? 'hidden' : ''}`}
      >
        <Sparkles size={22} />
      </motion.button>

      {/* Slide-over panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="card fixed inset-x-3 bottom-24 z-40 flex h-[70vh] flex-col overflow-hidden shadow-2xl lg:inset-x-auto lg:bottom-6 lg:right-6 lg:h-140 lg:w-96"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-3 dark:border-ink-700">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles size={16} /> AI Strategist
                {profile?.niche && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{profile.niche}</span>}
              </p>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={handleClear} aria-label="Clear chat" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your content coach, everywhere.</p>
                  <p className="max-w-56 text-xs text-slate-400">Ask about strategy, hooks, growth or monetization — I know your niche.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white'
                      : 'bg-slate-100 text-slate-700 dark:bg-ink-800 dark:text-slate-200'
                  }`}>
                    {m.role === 'user' ? m.content : <Markdown text={m.content} />}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3 w-fit dark:bg-ink-800">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="flex gap-2 border-t border-slate-200 p-2.5 dark:border-ink-700">
              <input
                className="input-base !py-2 text-sm"
                placeholder="Ask your strategist…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button onClick={send} disabled={!input.trim() || loading} className="btn-primary !px-3.5 !py-2">
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
