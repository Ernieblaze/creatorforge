import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Handshake, Copy, Wallet, Users, TrendingUp, Clock, Banknote,
  XCircle, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/toast'
import { Spinner } from '../components/ui'
import {
  partnersAvailable, nairaFromKobo, getMyPartner, applyAsPartner,
  updateBankDetails, getPartnerStats, listMyCommissions, listMyPayouts,
  requestPayout,
} from '../lib/partners'

const STATUS_BADGE = {
  pending: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  approved: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-rose-500/12 text-rose-500',
  suspended: 'bg-rose-500/12 text-rose-500',
  requested: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  paid: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  reversed: 'bg-rose-500/12 text-rose-500',
}

function Badge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_BADGE[status] || 'bg-slate-500/10 text-slate-500'}`}>
      {status}
    </span>
  )
}

function Stat({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className={`card p-4 ${highlight ? 'border-brand-500/40' : ''}`}>
      <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500"><Icon size={15} /></div>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

/* ── Bank details form (shared by apply + edit) ──────────── */
function BankFields({ values, set }) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Bank name</label>
        <input className="input-base" placeholder="e.g. GTBank" value={values.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Account number</label>
          <input className="input-base" inputMode="numeric" placeholder="0123456789" value={values.account_number} onChange={(e) => set('account_number', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Account name</label>
          <input className="input-base" placeholder="As it appears on the account" value={values.account_name} onChange={(e) => set('account_name', e.target.value)} />
        </div>
      </div>
    </>
  )
}

/* ── Application form (not yet a partner) ────────────────── */
function ApplyForm({ user, onDone }) {
  const toast = useToast()
  const [values, setValues] = useState({ promo_plan: '', audience: '', bank_name: '', account_number: '', account_name: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const canSubmit = values.promo_plan.trim() && values.audience.trim()

  async function submit() {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      await applyAsPartner(user.id, values)
      toast('Application sent! You will be notified once approved.')
      onDone()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card max-w-2xl space-y-5 p-6">
      <div>
        <h2 className="font-bold text-slate-900 dark:text-white">Apply to become a partner</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Earn real money for every paying customer you refer. Applications are reviewed personally — tell us how you'll promote CreatorForge.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">How will you promote CreatorForge? <span className="text-brand-500">*</span></label>
        <textarea rows={3} className="input-base resize-y" placeholder="e.g. My WhatsApp community of small business owners, TikTok reviews, campus ambassadors…" value={values.promo_plan} onChange={(e) => set('promo_plan', e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Your audience (size & where) <span className="text-brand-500">*</span></label>
        <input className="input-base" placeholder="e.g. 8k followers on X, 2 WhatsApp groups of 500" value={values.audience} onChange={(e) => set('audience', e.target.value)} />
      </div>
      <BankFields values={values} set={set} />
      <p className="text-xs text-slate-400">Bank details are used only to pay your commissions. You can update them later.</p>
      <button onClick={submit} disabled={!canSubmit || saving} className="btn-primary !py-3">
        {saving ? <Spinner size={16} /> : <Handshake size={16} />} Submit application
      </button>
    </div>
  )
}

/* ── Approved partner dashboard ──────────────────────────── */
function PartnerDashboard({ user, partner, refresh }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [commissions, setCommissions] = useState([])
  const [payouts, setPayouts] = useState([])
  const [requesting, setRequesting] = useState(false)
  const [editingBank, setEditingBank] = useState(false)
  const [bank, setBank] = useState({ bank_name: partner.bank_name || '', account_number: partner.account_number || '', account_name: partner.account_name || '' })
  const setB = (k, v) => setBank((s) => ({ ...s, [k]: v }))
  const link = `${window.location.origin}/?ref=${user.id}`
  const openRequest = payouts.find((p) => p.status === 'requested')

  useEffect(() => {
    getPartnerStats().then(setStats).catch(() => {})
    listMyCommissions(user.id).then(setCommissions)
    listMyPayouts(user.id).then(setPayouts)
  }, [user.id])

  async function withdraw() {
    if (requesting) return
    setRequesting(true)
    try {
      const res = await requestPayout()
      toast(`Payout of ${nairaFromKobo(res.amount_kobo)} requested — you'll receive it after review.`)
      listMyPayouts(user.id).then(setPayouts)
      getPartnerStats().then(setStats).catch(() => {})
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setRequesting(false)
    }
  }

  async function saveBank() {
    try {
      await updateBankDetails(user.id, bank)
      toast('Bank details updated')
      setEditingBank(false)
      refresh()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Referral link */}
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Your partner link</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{link}</p>
        </div>
        <span className="rounded-full bg-brand-500/12 px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-300">
          {Number(partner.commission_percent)}% per payment
        </span>
        <button
          className="btn-secondary !px-3.5 !py-2 text-xs"
          onClick={() => { navigator.clipboard.writeText(link); toast('Link copied!') }}
        >
          <Copy size={14} /> Copy
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="Signups from your link" value={stats?.signups ?? '—'} />
        <Stat icon={TrendingUp} label="Paying customers" value={stats?.paying ?? '—'} />
        <Stat icon={Clock} label="Pending (14-day hold)" value={stats ? nairaFromKobo(stats.pending_kobo) : '—'} sub="Becomes available after the refund window" />
        <Stat icon={Wallet} label="Available to withdraw" value={stats ? nairaFromKobo(stats.available_kobo) : '—'} sub={stats ? `${nairaFromKobo(stats.paid_kobo)} paid out so far` : ''} highlight />
      </div>

      {/* Withdraw */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Withdraw earnings</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Minimum ₦5,000 · paid to {partner.bank_name ? `${partner.bank_name} · ${partner.account_number}` : 'your bank account'} ·{' '}
            <button className="font-semibold text-brand-500 hover:underline" onClick={() => setEditingBank((v) => !v)}>
              {editingBank ? 'close' : 'edit bank details'}
            </button>
          </p>
        </div>
        {openRequest ? (
          <span className="flex items-center gap-2 rounded-xl bg-amber-500/12 px-4 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400">
            <Clock size={15} /> {nairaFromKobo(openRequest.amount_kobo)} being processed
          </span>
        ) : (
          <button onClick={withdraw} disabled={requesting} className="btn-primary !py-2.5">
            {requesting ? <Spinner size={15} /> : <Banknote size={15} />} Request payout
          </button>
        )}
      </div>
      {editingBank && (
        <div className="card max-w-2xl space-y-4 p-5">
          <BankFields values={bank} set={setB} />
          <button onClick={saveBank} className="btn-primary !py-2.5 text-sm">Save bank details</button>
        </div>
      )}

      {/* History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Earnings</h3>
          {commissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No commissions yet — share your link! 🚀</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{nairaFromKobo(c.amount_kobo)}</p>
                    <p className="text-[11px] text-slate-400">
                      {Number(c.percent)}% of {nairaFromKobo(c.payment_kobo)} · {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge status={c.status === 'pending' && new Date(c.available_at) <= new Date() ? 'approved' : c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Payouts</h3>
          {payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No payouts yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{nairaFromKobo(p.amount_kobo)}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(p.requested_at).toLocaleDateString()}{p.note ? ` · ${p.note}` : ''}
                    </p>
                  </div>
                  <Badge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Page shell ──────────────────────────────────────────── */
export default function Partner() {
  const { user } = useAuth()
  const [partner, setPartner] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = () => getMyPartner(user.id).then((p) => { setPartner(p); setLoaded(true) })
  useEffect(() => { if (user) refresh() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!partnersAvailable) {
    return <p className="card p-6 text-sm text-slate-500">The partner program needs the live database — it isn't available in demo mode.</p>
  }
  if (!loaded) {
    return <div className="grid h-64 place-items-center"><Spinner size={24} className="text-brand-500" /></div>
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3.5 text-white shadow-lg">
          <Handshake size={24} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">Partner Program</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Earn real money referring paying customers</p>
        </div>
        {partner && <span className="ml-auto"><Badge status={partner.status} /></span>}
      </div>

      {!partner && <ApplyForm user={user} onDone={refresh} />}

      {partner?.status === 'pending' && (
        <div className="card flex items-start gap-3 border-amber-500/30 p-5 text-sm text-slate-600 dark:text-slate-300">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <p>Your application is <b>under review</b>. You'll get access to your partner dashboard — link, balance and withdrawals — as soon as it's approved.</p>
        </div>
      )}

      {(partner?.status === 'rejected' || partner?.status === 'suspended') && (
        <div className="card flex items-start gap-3 border-rose-500/30 p-5 text-sm text-slate-600 dark:text-slate-300">
          <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
          <p>Your partner account is currently <b>{partner.status}</b>. Contact support if you believe this is a mistake.</p>
        </div>
      )}

      {partner?.status === 'approved' && (
        <PartnerDashboard user={user} partner={partner} refresh={refresh} />
      )}
    </motion.div>
  )
}
