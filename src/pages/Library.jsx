import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderHeart, Trash2, Search, X, CheckSquare, Square, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { listGenerations, deleteGeneration } from '../lib/db'
import { TOOLS, getTool } from '../lib/tools'
import { CopyButton, Markdown, EmptyState, Spinner } from '../components/ui'
import { useToast } from '../components/toast'

export default function Library() {
  const { user, plan } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (user) listGenerations(user.id, { limit: 200 }).then(setItems)
  }, [user])

  function toggleSelect(id) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  /** Download items as a single Markdown file (free tier gets a footer credit). */
  function exportItems(list, filename = 'creatorforge-export.md') {
    const md = list
      .map((g) => `# ${g.title || 'Untitled'}\n_${(getTool(g.tool) || TOOLS[0]).name} · ${new Date(g.created_at).toLocaleString()}_\n\n${g.output}\n\n---\n`)
      .join('\n')
      + (plan === 'free' ? '\n\n> ⚡ Made with CreatorForge — https://creatorforge-sage.vercel.app\n' : '')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
    toast(`Exported ${list.length} item${list.length > 1 ? 's' : ''} as Markdown`)
  }

  async function removeSelected() {
    const n = selected.size
    for (const id of selected) await deleteGeneration(user.id, id)
    setItems((s) => s.filter((g) => !selected.has(g.id)))
    setSelected(new Set())
    setSelectMode(false)
    toast(`Deleted ${n} item${n > 1 ? 's' : ''}`)
  }

  const shown = (items || []).filter(
    (g) =>
      (filter === 'all' || g.tool === filter) &&
      (!query || (g.title + g.output).toLowerCase().includes(query.toLowerCase()))
  )

  async function remove(id) {
    await deleteGeneration(user.id, id)
    setItems((s) => s.filter((g) => g.id !== id))
    setOpen(null)
    toast('Deleted from library')
  }

  const usedTools = [...new Set((items || []).map((g) => g.tool))]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Library</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything you've generated, saved automatically.</p>
        </div>
        {(items?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-xs font-semibold text-slate-400">{selected.size} selected</span>
                <button
                  onClick={() => exportItems(items.filter((g) => selected.has(g.id)))}
                  disabled={!selected.size}
                  className="btn-secondary !px-3.5 !py-2 text-xs disabled:opacity-40"
                >
                  <Download size={14} /> Export
                </button>
                <button
                  onClick={removeSelected}
                  disabled={!selected.size}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/60 px-3.5 py-2 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 disabled:opacity-40 dark:border-rose-500/40"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button onClick={() => { setSelectMode(false); setSelected(new Set()) }} className="btn-secondary !px-3.5 !py-2 text-xs">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => exportItems(items)} className="btn-secondary !px-3.5 !py-2 text-xs">
                  <Download size={14} /> Export all
                </button>
                <button onClick={() => setSelectMode(true)} className="btn-secondary !px-3.5 !py-2 text-xs">
                  <CheckSquare size={14} /> Select
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search + filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-base !pl-9" placeholder="Search your content…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === 'all' ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300' : 'border-slate-300 text-slate-500 dark:border-ink-600'}`}>All</button>
          {usedTools.map((tid) => {
            const t = getTool(tid) || TOOLS[0]
            return (
              <button key={tid} onClick={() => setFilter(tid)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === tid ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300' : 'border-slate-300 text-slate-500 dark:border-ink-600'}`}>
                {t.name}
              </button>
            )
          })}
        </div>
      </div>

      {items === null ? (
        <div className="grid place-items-center py-20"><Spinner size={26} className="text-brand-500" /></div>
      ) : shown.length === 0 ? (
        <EmptyState icon={FolderHeart} title="Nothing here yet" subtitle="Generate content with any tool and it lands here automatically." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((g) => {
            const t = getTool(g.tool) || TOOLS[0]
            return (
              <motion.button
                key={g.id}
                layout
                onClick={() => (selectMode ? toggleSelect(g.id) : setOpen(g))}
                className={`card group relative p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  selectMode && selected.has(g.id) ? 'border-brand-500 ring-2 ring-brand-500/25' : 'hover:border-brand-400/50'
                }`}
              >
                {selectMode && (
                  <span className="absolute top-3 right-3 text-brand-500">
                    {selected.has(g.id) ? <CheckSquare size={17} /> : <Square size={17} className="text-slate-300 dark:text-ink-600" />}
                  </span>
                )}
                <div className="mb-2 flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${t.color} text-white`}>
                    <t.icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{g.title || t.name}</p>
                    <p className="text-xs text-slate-400">{t.name} · {new Date(g.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{g.output}</p>
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }}
              className="card max-h-[85vh] w-full max-w-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-ink-700">
                <p className="truncate pr-3 font-bold text-slate-900 dark:text-white">{open.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyButton text={open.output} />
                  <button
                    onClick={() => exportItems([open], `${(open.title || 'content').slice(0, 40).replace(/[^\w-]+/g, '-')}.md`)}
                    aria-label="Export"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600"
                  >
                    <Download size={14} />
                  </button>
                  <button onClick={() => remove(open.id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-rose-400 hover:text-rose-500 dark:border-ink-600">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setOpen(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 dark:border-ink-600">
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-5">
                <Markdown text={open.output} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
