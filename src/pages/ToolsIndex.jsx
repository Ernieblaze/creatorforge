import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { TOOLS } from '../lib/tools'
import { isToolEnabled } from '../lib/adminData'

/** All-tools grid — the mobile bottom-nav "Tools" tab lands here so users
 *  pick a tool instead of being dropped into one arbitrarily. */
export default function ToolsIndex() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">All tools</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick a tool — everything you generate lands in your Library.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {TOOLS.filter((t) => isToolEnabled(t.id)).map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.03 + Math.min(i, 11) * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
            whileTap={{ scale: 0.96 }}
          >
            <Link
              to={`/app/tool/${t.id}`}
              className="card group flex h-full flex-col items-start gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-600/10 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 sm:h-11 sm:w-11`}>
                <t.icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{t.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500 sm:mt-0 sm:truncate dark:text-slate-400">{t.tagline}</p>
              </span>
              <ArrowRight size={16} className="hidden text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500 sm:block" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
