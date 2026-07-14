import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBioPage } from '../lib/db'
import { BioCard } from '../components/BioLinkBuilder'
import { Spinner, Logo } from '../components/ui'

/**
 * Public link-in-bio page: /u/:slug — no login required.
 * Rendered full-screen with the owner's chosen theme.
 */
export default function BioPage() {
  const { slug } = useParams()
  const [page, setPage] = useState(undefined) // undefined = loading, null = not found

  useEffect(() => {
    getBioPage(slug || '').then((p) => setPage(p ?? null))
  }, [slug])

  useEffect(() => {
    if (page?.name) document.title = `${page.name} — CreatorForge`
    return () => { document.title = 'CreatorForge — Content OS for Creators & Hustlers' }
  }, [page])

  if (page === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0d14]">
        <Spinner size={28} className="text-brand-500" />
      </div>
    )
  }

  if (page === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0b0d14] px-6 text-center">
        <div>
          <Logo />
          <p className="mt-6 text-lg font-bold text-white">This page doesn't exist (yet)</p>
          <p className="mt-2 text-sm text-slate-400">Want a link-in-bio page like this — plus 15 AI content tools?</p>
          <Link to="/" className="btn-primary mt-6 inline-flex">Create yours free</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <BioCard page={page} />
    </div>
  )
}
