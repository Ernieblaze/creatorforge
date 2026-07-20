import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, Star, ChevronRight, Menu, X as XIcon,
} from 'lucide-react'
import { Logo, ThemeToggle, DemoModal } from '../components/ui'
import { TOOLS } from '../lib/tools'
import { useAuth } from '../context/AuthContext'

/* Motion presets */
const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: 'easeOut' },
}

/* ── Floating particles (pure CSS, GPU-cheap) ────────────── */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  top: `${(i * 37) % 100}%`,
  size: 2 + (i % 3) * 1.5,
  delay: `${(i * 0.7) % 6}s`,
  slow: i % 2 === 0,
}))

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-brand-400/40 dark:bg-brand-300/30 ${p.slow ? 'animate-float-slow' : 'animate-float'}`}
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay }}
        />
      ))}
    </div>
  )
}

/* ── Animated hero demo: topic → progress → result ───────── */
const DEMO_SCRIPT = [
  { tool: 'Post Generator', platform: '𝕏 Post', topic: 'How I grew my thrift business with WhatsApp', out: '"Nobody is coming to save your hustle. WhatsApp status is a free billboard — here\'s my 3-step play… 🧵"', metric: '↑ optimized hook · CTA · thread format' },
  { tool: 'Video Scripter', platform: '🎬 Script', topic: '5 side hustles for Nigerian students', out: 'HOOK (0:00): "This video will save you six months of trial and error — and I\'ll prove it in 60 seconds."', metric: '↑ retention hook · timestamps · end-screen CTA' },
  { tool: 'Ad Studio', platform: '📣 Meta Ad', topic: 'Online baking class, ₦15,000', out: '"Tired of baking for free likes? Turn the skill you already have into steady income. Doors close Friday 👇"', metric: '↑ pain-point hook · benefit stack · urgency' },
  { tool: 'Viral Score', platform: '⚡ Score 86/100', topic: 'My draft about saving money as a student', out: 'Strong emotional trigger. Rewrite delivered: "I saved ₦150k in 6 months on a student budget — the exact system:"', metric: '↑ hook +31 · CTA +18 · rewrite ready' },
]

function HeroDemo() {
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState('typing') // typing → generating → output
  const cur = DEMO_SCRIPT[step]

  useEffect(() => {
    if (phase === 'typing') {
      if (typed.length < cur.topic.length) {
        // ease: fast mid-word, brief pause at spaces for a human feel
        const ch = cur.topic[typed.length]
        const t = setTimeout(() => setTyped(cur.topic.slice(0, typed.length + 1)), ch === ' ' ? 70 : 26)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('generating'), 380)
      return () => clearTimeout(t)
    }
    if (phase === 'generating') {
      const t = setTimeout(() => setPhase('output'), 1150)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setTyped('')
      setPhase('typing')
      setStep((s) => (s + 1) % DEMO_SCRIPT.length)
    }, 3600)
    return () => clearTimeout(t)
  }, [typed, phase, step]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card relative overflow-hidden p-5 text-left shadow-2xl shadow-brand-600/10 dark:shadow-black/40">
      {/* animated top border sheen */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 animate-shimmer bg-gradient-to-r from-transparent via-brand-500 to-transparent bg-[length:200%_100%]" />
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <motion.span key={cur.tool} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="ml-3 text-xs font-medium text-slate-400">
          CreatorForge · {cur.tool}
        </motion.span>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-ink-600 dark:bg-ink-800">
        <span className="text-slate-800 dark:text-slate-100">{typed}</span>
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-brand-500 align-middle" />
      </div>
      <div className="mt-3 min-h-32">
        {phase === 'generating' && (
          <div className="pt-1">
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                initial={{ width: '4%' }}
                animate={{ width: '96%' }}
                transition={{ duration: 1.05, ease: [0.3, 0.6, 0.4, 1] }}
              />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-4/5" />
              <div className="skeleton h-3.5 w-2/3" />
            </div>
          </div>
        )}
        {phase === 'output' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="rounded-xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 p-4">
              <span className="mb-2 inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-bold text-brand-600 dark:bg-ink-900/60 dark:text-brand-300">
                {cur.platform}
              </span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{cur.out}</p>
            </div>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="mt-2.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-emerald-500"
            >
              <Check size={12} /> {cur.metric}
            </motion.p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ── Testimonials ────────────────────────────────────────── */
// Early-community voices. Keep quotes about the PRODUCT experience —
// no invented revenue/follower claims we can't stand behind.
const TESTIMONIALS = [
  { name: 'Fashion creator', role: 'Lagos', text: 'I went from posting randomly to a real content system. Every post now starts from a plan instead of panic.', stat: 'Content Calendar', featured: true },
  { name: 'Student & tech hustler', role: 'Ibadan', text: 'The repurposer alone is worth it. One video becomes a thread, a carousel and three shorts in minutes.', stat: 'Repurposing Engine' },
  { name: 'Baker & business owner', role: 'Abuja', text: 'The ad copy sounds like I hired a copywriter, and Viral Score fixes my hooks before I even post.', stat: 'Ad Studio' },
  { name: 'Comedy skits creator', role: 'Enugu', text: 'The 30-day calendar removed my biggest problem: "what do I post today?" I just open the app and execute.', stat: 'Content Calendar' },
  { name: 'Beauty & skincare creator', role: 'Kano', text: 'The strategist chat feels like a content coach on WhatsApp. It knows my niche and gives real next steps, not vibes.', stat: 'AI Strategist' },
  { name: 'Food vendors', role: 'Port Harcourt', text: 'The WhatsApp status scripts made our pre-order posts feel professional — customers noticed immediately.', stat: 'Post Generator' },
]

const FAQ_STATS = [
  { n: '17', l: 'AI tools in one place' },
  { n: '6', l: 'platforms optimized' },
  { n: '30s', l: 'from idea to post' },
  { n: '₦0', l: 'to start today' },
]

export default function Landing() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoTool, setDemoTool] = useState(null)
  const cta = user ? '/app' : '/login'

  return (
    <div className="min-h-screen bg-white dark:bg-ink-900">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-ink-700/60 dark:bg-ink-900/80">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo /></Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
            <a href="#features" className="transition-colors hover:text-brand-500">Features</a>
            <a href="#testimonials" className="transition-colors hover:text-brand-500">Creators</a>
            <a href="#pricing" className="transition-colors hover:text-brand-500">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to={cta} className="btn-primary hidden !px-4 !py-2 text-sm md:inline-flex">
              {user ? 'Open dashboard' : 'Start free'} <ArrowRight size={15} />
            </Link>
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <XIcon size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div className="border-t border-slate-200 px-6 py-4 md:hidden dark:border-ink-700">
            <div className="flex flex-col gap-4 text-sm font-medium">
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#testimonials" onClick={() => setMenuOpen(false)}>Creators</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
              <Link to={cta} className="btn-primary justify-center">Start free with Google</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* glow background */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-130 w-200 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl dark:bg-brand-600/25" />
          <div className="absolute top-20 right-0 h-80 w-80 animate-float-slow rounded-full bg-accent-600/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 animate-float rounded-full bg-brand-500/10 blur-3xl" />
        </div>
        <Particles />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <motion.div {...fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              Built for Nigerian creators & hustlers
            </motion.div>
            <motion.h1 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] dark:text-white">
              The Complete <span className="text-gradient">Operating System</span> for Content Creators & Hustlers
            </motion.h1>
            <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }} className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Posts, scripts, ads, calendars, viral scores and strategy — 17 AI tools in one clean workspace. Stop juggling apps. Start compounding.
            </motion.p>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={cta} className="btn-primary !px-7 !py-3.5 text-base">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
                Start Free with Google
              </Link>
              <a href="#features" className="btn-secondary !py-3.5">
                See all tools <ChevronRight size={16} />
              </a>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.24 }} className="mt-4">
              <a
                href="/creatorforge.apk"
                download
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-600 transition-colors hover:border-emerald-500 dark:text-emerald-400"
              >
                📥 Download the Android app (APK)
              </a>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Direct install — your phone may ask to allow "unknown sources"; that's normal for apps outside Play Store. Play Store version coming soon.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.28 }} className="mt-10 grid grid-cols-4 gap-4">
              {FAQ_STATS.map((s) => (
                <div key={s.l}>
                  <p className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-white">{s.n}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.l}</p>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
          >
            <HeroDemo />
          </motion.div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Everything in <span className="text-gradient">one place</span>
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Every tool a serious creator needs — connected, so your ideas flow from research to post to profit.
          </p>
        </motion.div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <motion.div
              key={t.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.06 }}
              className="card group relative p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/50 hover:shadow-xl hover:shadow-brand-600/10"
            >
              <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-md transition-transform group-hover:scale-110`}>
                <t.icon size={20} />
              </div>
              <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.tagline}</p>
              {!t.special || t.special === 'viral' || t.id === 'calendar' ? (
                <button
                  onClick={() => setDemoTool(t)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-500 opacity-0 transition-opacity duration-200 hover:underline group-hover:opacity-100 focus:opacity-100"
                >
                  Try demo <ChevronRight size={13} />
                </button>
              ) : null}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────── */}
      <section id="testimonials" className="border-y border-slate-200 bg-slate-50 dark:border-ink-700 dark:bg-ink-850">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <motion.h2 {...fadeUp} className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Creators are <span className="text-gradient">already winning</span>
          </motion.h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}
                className={`card flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-600/10 ${
                  t.featured ? 'border-brand-500/40 sm:col-span-2 lg:col-span-1 lg:row-span-1' : ''
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={15} fill="currentColor" strokeWidth={0} />)}
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">{t.stat}</span>
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">"{t.text}"</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
                    {t.name[0]}
                  </span>
                  <span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.h2 {...fadeUp} className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Simple, honest <span className="text-gradient">pricing</span>
        </motion.h2>
        <motion.p {...fadeUp} className="mx-auto mt-4 max-w-lg text-center text-slate-600 dark:text-slate-400">
          Start free. Upgrade when the tools start paying for themselves.
        </motion.p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
          <motion.div {...fadeUp} className="card p-7">
            <p className="font-bold text-slate-900 dark:text-white">Free</p>
            <p className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">₦0<span className="text-base font-medium text-slate-400">/forever</span></p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {['5 free credits every day', 'All 17 tools (basic)', 'Content library', 'Community support'].map((f) => (
                <li key={f} className="flex items-center gap-2.5"><Check size={16} className="text-emerald-500" /> {f}</li>
              ))}
            </ul>
            <Link to={cta} className="btn-secondary mt-7 w-full">Start free</Link>
          </motion.div>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="card relative overflow-hidden border-brand-500/50 p-7 shadow-xl shadow-brand-600/15">
            <span className="absolute top-4 right-4 rounded-full bg-gradient-to-r from-brand-600 to-accent-600 px-3 py-1 text-xs font-bold text-white">POPULAR</span>
            <p className="font-bold text-slate-900 dark:text-white">Premium</p>
            <p className="mt-3 text-4xl font-extrabold text-slate-900 dark:text-white">₦3,000<span className="text-base font-medium text-slate-400">/month</span></p>
            <p className="mt-1 text-xs font-medium text-emerald-500">₦30,000/year — save 2 months</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {['50 credits daily (fair-use "unlimited")', 'Advanced tool modes & priority AI', 'Full history + exports', 'Early access to new tools', 'Priority support'].map((f) => (
                <li key={f} className="flex items-center gap-2.5"><Check size={16} className="text-emerald-500" /> {f}</li>
              ))}
            </ul>
            <Link to={cta} className="btn-primary mt-7 w-full">Go Premium</Link>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-accent-600 px-6 py-14 text-center text-white sm:px-12">
          <div aria-hidden className="absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Your content deserves a system.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/85">Join creators turning consistency into income. Free to start — takes 20 seconds.</p>
          <Link to={cta} className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-brand-700 shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98]">
            Start Free with Google <ArrowRight size={17} />
          </Link>
        </motion.div>
      </section>

      <DemoModal tool={demoTool} onClose={() => setDemoTool(null)} />

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-slate-200 py-10 dark:border-ink-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Link to="/terms" className="transition-colors hover:text-brand-500">Terms</Link>
            <Link to="/privacy" className="transition-colors hover:text-brand-500">Privacy</Link>
            <a href="mailto:ernieblazze@gmail.com" className="transition-colors hover:text-brand-500">Support</a>
            <a href="/creatorforge.apk" download className="transition-colors hover:text-brand-500">Android app</a>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} CreatorForge. Built for hustlers, by hustlers. 🇳🇬</p>
        </div>
      </footer>
    </div>
  )
}
