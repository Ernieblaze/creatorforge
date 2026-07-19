import { useEffect, useState } from 'react'
import { Handshake, Banknote, Clock, Wallet, Copy } from 'lucide-react'
import { SectionHeader, StatCard } from './shared'
import { useToast } from '../../components/toast'
import { Spinner } from '../../components/ui'
import {
  nairaFromKobo, adminListPartners, adminSetPartner,
  adminListPayouts, adminResolvePayout, adminListCommissions,
} from '../../lib/partners'

const TABS = ['Partners', 'Payout requests', 'Activity']

const badge = {
  pending: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  approved: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-rose-500/12 text-rose-500',
  suspended: 'bg-rose-500/12 text-rose-500',
  requested: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  paid: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  reversed: 'bg-rose-500/12 text-rose-500',
}
const Badge = ({ s }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${badge[s] || 'bg-slate-500/10 text-slate-500'}`}>{s}</span>
)

function PartnerRow({ p, onChange }) {
  const toast = useToast()
  const [percent, setPercent] = useState(Number(p.commission_percent))
  const [busy, setBusy] = useState(false)

  async function setStatus(status) {
    setBusy(true)
    try {
      await adminSetPartner(p.user_id, { status })
      toast(`Partner ${status}`)
      onChange()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }
  async function savePercent() {
    setBusy(true)
    try {
      await adminSetPartner(p.user_id, { commission_percent: percent })
      toast(`Commission set to ${percent}%`)
      onChange()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold text-slate-900 dark:text-white">{p.profile?.username || p.profile?.email || p.user_id.slice(0, 8)}</p>
        <span className="text-xs text-slate-400">{p.profile?.email}</span>
        <span className="ml-auto"><Badge s={p.status} /></span>
      </div>
      <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 dark:text-slate-400">
        <p><b className="text-slate-700 dark:text-slate-300">Promo plan:</b> {p.promo_plan || '—'}</p>
        <p><b className="text-slate-700 dark:text-slate-300">Audience:</b> {p.audience || '—'}</p>
        <p><b className="text-slate-700 dark:text-slate-300">Bank:</b> {p.bank_name ? `${p.bank_name} · ${p.account_number} · ${p.account_name}` : '—'}</p>
        <p><b className="text-slate-700 dark:text-slate-300">Applied:</b> {new Date(p.created_at).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-ink-700">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Commission %
          <input
            type="number" min="0" max="90"
            className="input-base !w-20 !px-2.5 !py-1.5 text-sm"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
        </label>
        <button onClick={savePercent} disabled={busy} className="btn-secondary !px-3 !py-1.5 text-xs">Save %</button>
        <span className="flex-1" />
        {p.status !== 'approved' && (
          <button onClick={() => setStatus('approved')} disabled={busy} className="btn-primary !px-3.5 !py-1.5 text-xs">Approve</button>
        )}
        {p.status === 'pending' && (
          <button onClick={() => setStatus('rejected')} disabled={busy} className="btn-secondary !px-3.5 !py-1.5 text-xs !text-rose-500">Reject</button>
        )}
        {p.status === 'approved' && (
          <button onClick={() => setStatus('suspended')} disabled={busy} className="btn-secondary !px-3.5 !py-1.5 text-xs !text-rose-500">Suspend</button>
        )}
      </div>
    </div>
  )
}

function PayoutRow({ p, onChange }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const bank = p.partner ? `${p.partner.bank_name || '?'} · ${p.partner.account_number || '?'} · ${p.partner.account_name || '?'}` : '—'

  async function resolve(action) {
    const note = action === 'paid'
      ? window.prompt('Optional note (e.g. transfer reference):') ?? undefined
      : window.prompt('Reason for rejecting (shown to the partner):') ?? undefined
    setBusy(true)
    try {
      await adminResolvePayout(p.id, action, note)
      toast(action === 'paid' ? 'Marked as paid ✅' : 'Payout rejected')
      onChange()
    } catch (e) { toast(e.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 dark:text-white">
          {nairaFromKobo(p.amount_kobo)} — {p.profile?.username || p.profile?.email || 'partner'}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {bank}
          <button
            className="text-brand-500 hover:underline"
            onClick={() => { navigator.clipboard.writeText(p.partner?.account_number || ''); toast('Account number copied') }}
          >
            <Copy size={12} />
          </button>
        </p>
        <p className="text-[11px] text-slate-400">
          Requested {new Date(p.requested_at).toLocaleString()}{p.note ? ` · ${p.note}` : ''}
        </p>
      </div>
      <Badge s={p.status} />
      {p.status === 'requested' && (
        <div className="flex gap-2">
          <button onClick={() => resolve('paid')} disabled={busy} className="btn-primary !px-3.5 !py-2 text-xs">
            {busy ? <Spinner size={13} /> : <Banknote size={14} />} Mark paid
          </button>
          <button onClick={() => resolve('rejected')} disabled={busy} className="btn-secondary !px-3.5 !py-2 text-xs !text-rose-500">Reject</button>
        </div>
      )}
    </div>
  )
}

export default function PartnersSection() {
  const [tab, setTab] = useState('Partners')
  const [partners, setPartners] = useState(null)
  const [payouts, setPayouts] = useState(null)
  const [commissions, setCommissions] = useState(null)

  const load = () => {
    adminListPartners().then(setPartners)
    adminListPayouts().then(setPayouts)
    adminListCommissions().then(setCommissions)
  }
  useEffect(load, [])

  const owedKobo = (commissions ?? [])
    .filter((c) => c.status === 'pending')
    .reduce((s, c) => s + c.amount_kobo, 0)
  const paidKobo = (commissions ?? [])
    .filter((c) => c.status === 'paid')
    .reduce((s, c) => s + c.amount_kobo, 0)
  const openRequests = (payouts ?? []).filter((p) => p.status === 'requested')

  return (
    <div>
      <SectionHeader title="Partners" subtitle="Approve partners, set commissions, process payouts" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Handshake} label="Approved partners" value={(partners ?? []).filter((p) => p.status === 'approved').length} />
        <StatCard icon={Clock} label="Owed to partners" value={nairaFromKobo(owedKobo)} sub="Pending + available commissions" />
        <StatCard icon={Wallet} label="Paid out all-time" value={nairaFromKobo(paidKobo)} />
        <StatCard icon={Banknote} label="Open payout requests" value={openRequests.length} color="bg-amber-500/10 text-amber-500" />
      </div>

      <div className="mb-5 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t
                ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                : 'border-slate-200 text-slate-500 hover:border-brand-400 dark:border-ink-600 dark:text-slate-400'
            }`}
          >
            {t}
            {t === 'Payout requests' && openRequests.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">{openRequests.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Partners' && (
        partners === null ? <Spinner size={20} className="text-brand-500" /> :
        partners.length === 0 ? <p className="card p-8 text-center text-sm text-slate-400">No partner applications yet.</p> :
        <div className="space-y-4">{partners.map((p) => <PartnerRow key={p.user_id} p={p} onChange={load} />)}</div>
      )}

      {tab === 'Payout requests' && (
        payouts === null ? <Spinner size={20} className="text-brand-500" /> :
        payouts.length === 0 ? <p className="card p-8 text-center text-sm text-slate-400">No payout requests yet.</p> :
        <div className="space-y-4">{payouts.map((p) => <PayoutRow key={p.id} p={p} onChange={load} />)}</div>
      )}

      {tab === 'Activity' && (
        commissions === null ? <Spinner size={20} className="text-brand-500" /> :
        commissions.length === 0 ? <p className="card p-8 text-center text-sm text-slate-400">No commissions earned yet.</p> :
        <div className="card divide-y divide-slate-100 p-2 dark:divide-ink-700">
          {commissions.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm">
              <span className="font-bold text-slate-900 dark:text-white">{nairaFromKobo(c.amount_kobo)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                to {c.partnerProfile?.username || c.partnerProfile?.email || 'partner'} · {Number(c.percent)}% of {nairaFromKobo(c.payment_kobo)}
                {c.referredProfile ? ` from ${c.referredProfile.email}` : ''}
              </span>
              <span className="ml-auto text-[11px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
              <Badge s={c.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
