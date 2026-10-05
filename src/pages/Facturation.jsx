import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Download, Send, Check, AlertTriangle, ChevronRight, Sparkles, Anchor, User } from 'lucide-react'
import { getClientBills, getProviderBills, summarize, toCsv, TODAY } from '@/lib/billing'
import { buildInvoiceData } from '@/lib/invoice'
import { buildMenageInvoiceData } from '@/lib/menage-invoice'
import { getState, subscribe, getInvoice, sendInvoice, markInvoicePaid, getMenageInvoice, markMenageInvoicePaid, markSkipperPaid } from '@/lib/shared-state'
import { fmtDate } from '@/lib/dates'
import InvoiceModal from '@/components/planning/InvoiceModal'
import MenageInvoiceModal from '@/components/planning/MenageInvoiceModal'

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const euro = n => `${Math.round(n).toLocaleString('fr-FR')} €`

const STATUS = {
  prevue: { label: 'Prévue', cls: 'bg-gray-100 text-gray-500' },
  envoyee: { label: 'Envoyée', cls: 'bg-amber-50 text-amber-700' },
  a_venir: { label: 'À venir', cls: 'bg-gray-100 text-gray-500' },
  a_payer: { label: 'À payer', cls: 'bg-navy-50 text-navy-700' },
  reglee: { label: 'Réglée', cls: 'bg-teal-50 text-teal-700' },
}
const CLIENT_FILTERS = [['tous', 'Toutes'], ['envoyee', 'À encaisser'], ['prevue', 'Prévues'], ['reglee', 'Réglées']]
const PROVIDER_FILTERS = [['tous', 'Toutes'], ['a_payer', 'À payer'], ['a_venir', 'À venir'], ['reglee', 'Réglées']]
const KIND_ICON = { client: User, menage: Sparkles, skipper: Anchor }

export default function Facturation() {
  const { activeBrand } = useOutletContext() || {}
  const [, setS] = useState(getState())
  useEffect(() => subscribe(s => setS(s)), [])
  const [period, setPeriod] = useState('2026') // 'YYYY-MM' | '2026' | 'all'
  const [tab, setTab] = useState('clients')
  const [filter, setFilter] = useState('tous')
  const [limit, setLimit] = useState(40)
  const [openClient, setOpenClient] = useState(null)
  const [openMenage, setOpenMenage] = useState(null)

  const inPeriod = r => period === 'all' || r.date.startsWith(period)
  const allClients = getClientBills(activeBrand)
  const allProviders = getProviderBills(activeBrand)
  const clients = allClients.filter(inPeriod)
  const providers = allProviders.filter(inPeriod)
  const k = summarize(clients, providers)

  // Barres mensuelles 2026 : encaissé / à encaisser / prévu.
  const months = MONTHS.map((label, i) => {
    const ym = `2026-${String(i + 1).padStart(2, '0')}`
    const rows = allClients.filter(r => r.date.startsWith(ym))
    const v = st => rows.filter(r => r.status === st).reduce((n, r) => n + r.amount, 0)
    return { ym, label, reglee: v('reglee'), envoyee: v('envoyee'), prevue: v('prevue') }
  })
  const maxMonth = Math.max(1, ...months.map(m => m.reglee + m.envoyee + m.prevue))

  const rows = (tab === 'clients' ? clients : providers)
    .filter(r => filter === 'tous' || r.status === filter)
    .sort((a, b) => Number(b.late || 0) - Number(a.late || 0) || a.date.localeCompare(b.date))
  const filters = tab === 'clients' ? CLIENT_FILTERS : PROVIDER_FILTERS
  const base = tab === 'clients' ? clients : providers

  function act(r) {
    if (r.kind === 'client') {
      getInvoice(r.booking.id, buildInvoiceData(r.booking))
      if (r.status === 'prevue') sendInvoice(r.booking.id)
      else if (r.status === 'envoyee') markInvoicePaid(r.booking.id)
    } else if (r.kind === 'menage') {
      getMenageInvoice(r.mission.key, buildMenageInvoiceData(r.mission))
      markMenageInvoicePaid(r.mission.key, 'manuel')
    } else if (r.kind === 'skipper') {
      markSkipperPaid(r.booking.id)
    }
  }
  const actionLabel = r => r.kind === 'client'
    ? (r.status === 'prevue' ? 'Envoyer' : r.status === 'envoyee' ? 'Marquer réglée' : null)
    : (r.status === 'a_payer' ? 'Marquer payée' : null)

  function exportCsv() {
    const blob = new Blob(['\ufeff' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `helmo-facturation-${tab}-${period}.csv`
    a.click()
  }

  const periodLabel = period === 'all' ? 'Tout' : period === '2026' ? 'Saison 2026' : `${MONTHS[Number(period.slice(5)) - 1]} ${period.slice(0, 4)}`

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Facturation</h1>
          <p className="text-xs text-gray-400">{periodLabel} · ce que tu encaisses et ce que tu dois</p>
        </div>
        <div className="flex items-center gap-2">
          {[['2026-07', 'Ce mois'], ['2026', 'Saison 2026'], ['all', 'Tout']].map(([id, l]) => (
            <button key={id} onClick={() => setPeriod(id)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${period === id ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{l}</button>
          ))}
          <button className="btn-ghost text-xs" onClick={exportCsv}><Download size={13} /> Export comptable</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Les 4 chiffres qui comptent */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <button className="card text-left hover:shadow-card-hover" onClick={() => { setTab('clients'); setFilter('reglee') }}>
            <p className="text-[11px] text-gray-400">Encaissé</p>
            <p className="font-display text-xl font-bold text-teal-600">{euro(k.encaisse)}</p>
          </button>
          <button className="card text-left hover:shadow-card-hover" onClick={() => { setTab('clients'); setFilter('envoyee') }}>
            <p className="text-[11px] text-gray-400">À encaisser</p>
            <p className="font-display text-xl font-bold text-amber-600">{euro(k.aEncaisser)}</p>
            {k.enRetard > 0 && <p className="text-[11px] text-danger-600 flex items-center gap-1 mt-0.5"><AlertTriangle size={11} /> dont {euro(k.enRetard)} en retard</p>}
          </button>
          <button className="card text-left hover:shadow-card-hover" onClick={() => { setTab('clients'); setFilter('prevue') }}>
            <p className="text-[11px] text-gray-400">Prévu (pas encore facturé)</p>
            <p className="font-display text-xl font-bold text-gray-500">{euro(k.prevu)}</p>
          </button>
          <button className="card text-left hover:shadow-card-hover" onClick={() => { setTab('prestataires'); setFilter('a_payer') }}>
            <p className="text-[11px] text-gray-400">À payer (ménage, skippers)</p>
            <p className="font-display text-xl font-bold text-navy-700">{euro(k.aPayer)}</p>
          </button>
        </div>

        {/* Chiffre d'affaires mois par mois — clic sur un mois = filtre */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Chiffre d'affaires 2026</p>
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-400" /> Encaissé</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300" /> À encaisser</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200" /> Prévu</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {months.map(m => {
              const total = m.reglee + m.envoyee + m.prevue
              const h = v => `${(v / maxMonth) * 100}%`
              const active = period === m.ym
              return (
                <button key={m.ym} onClick={() => setPeriod(active ? '2026' : m.ym)} title={`${m.label} : ${euro(total)}`} className="flex-1 h-full flex flex-col justify-end items-center group">
                  <div className={`w-full flex flex-col justify-end rounded-t-md overflow-hidden ${active ? 'ring-2 ring-navy-600' : ''}`} style={{ height: h(total) }}>
                    <div className="bg-gray-200" style={{ height: total ? `${(m.prevue / total) * 100}%` : 0 }} />
                    <div className="bg-amber-300" style={{ height: total ? `${(m.envoyee / total) * 100}%` : 0 }} />
                    <div className="bg-teal-400" style={{ height: total ? `${(m.reglee / total) * 100}%` : 0 }} />
                  </div>
                  <span className={`text-[10px] mt-1 ${active ? 'text-navy-700 font-semibold' : 'text-gray-400 group-hover:text-gray-600'}`}>{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Onglets clients / prestataires + filtres */}
        <div className="flex items-center gap-4 mb-3 border-b border-gray-100">
          {[['clients', 'Clients · à encaisser'], ['prestataires', 'Prestataires · à payer']].map(([id, l]) => (
            <button key={id} onClick={() => { setTab(id); setFilter('tous'); setLimit(40) }} className={`text-sm pb-2 -mb-px border-b-2 ${tab === id ? 'border-navy-600 text-navy-800 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-3">
          {filters.map(([id, l]) => (
            <button key={id} onClick={() => { setFilter(id); setLimit(40) }} className={`text-xs font-medium px-3 py-1 rounded-full ${filter === id ? 'bg-navy-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {l} ({id === 'tous' ? base.length : base.filter(r => r.status === id).length})
            </button>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
          {rows.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucune facture ici sur cette période.</p>}
          {rows.slice(0, limit).map(r => {
            const Icon = KIND_ICON[r.kind]
            const action = actionLabel(r)
            const st = STATUS[r.status]
            return (
              <div key={r.key} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => r.kind === 'client' ? setOpenClient(r.booking) : r.kind === 'menage' ? setOpenMenage(r.mission) : null}>
                <Icon size={14} className="text-gray-400 flex-shrink-0" />
                <div className="w-16 text-xs text-gray-500 flex-shrink-0">{fmtDate(r.date)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.who}</p>
                  <p className="text-[11px] text-gray-400 truncate">{r.what}</p>
                </div>
                {r.late && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-danger-50 text-danger-700 flex-shrink-0">En retard</span>}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${st.cls}`}>{st.label}{r.status === 'reglee' && r.paidAt ? ` le ${fmtDate(r.paidAt)}` : ''}</span>
                <p className="w-20 text-right text-sm font-semibold text-navy-900 flex-shrink-0">{euro(r.amount)}</p>
                <div className="w-28 flex justify-end flex-shrink-0">
                  {action ? (
                    <button className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${r.status === 'prevue' ? 'bg-navy-600 text-white' : 'bg-teal-50 text-teal-700 border border-teal-100'}`} onClick={e => { e.stopPropagation(); act(r) }}>
                      {r.status === 'prevue' ? <Send size={11} /> : <Check size={11} />} {action}
                    </button>
                  ) : <ChevronRight size={14} className="text-gray-300" />}
                </div>
              </div>
            )
          })}
          {rows.length > limit && (
            <button className="w-full text-xs text-navy-600 py-2.5 hover:bg-gray-50" onClick={() => setLimit(l => l + 40)}>Voir plus ({rows.length - limit} restantes)</button>
          )}
        </div>
      </div>

      {openClient && <InvoiceModal booking={openClient} onClose={() => setOpenClient(null)} />}
      {openMenage && <MenageInvoiceModal mission={openMenage} editable onClose={() => setOpenMenage(null)} />}
    </div>
  )
}
