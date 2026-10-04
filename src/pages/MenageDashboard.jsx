import { useState, useEffect } from 'react'
import { X, LogOut, Sparkles, Check, ChevronLeft, Phone, Mail, Printer, Receipt, Calendar, Building2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MENAGE_PROVIDERS } from '@/lib/mock-data'
import { getMissionsForProvider, getProviderByAccessCode, groupMissionsByAgency, doneByLabel, paidLabel } from '@/lib/menage-missions'
import { getState, subscribe, toggleMenageDone } from '@/lib/shared-state'
import MenageInvoiceModal from '@/components/planning/MenageInvoiceModal'

const STATUS_PILL = {
  prevu: { label: 'À venir', cls: 'bg-gray-100 text-gray-500' },
  fait: { label: 'En attente de paiement', cls: 'bg-amber-50 text-amber-700' },
  regle: { label: 'Réglé', cls: 'bg-teal-50 text-teal-700' },
}
const LIST_TITLES = { all: 'Toutes les factures', faits: 'Factures des ménages faits', prevu: 'Factures à venir (ménages pas encore faits)' }

// Liste de factures derrière chaque case du haut : toutes / faits / restant à faire.
function InvoiceListModal({ filter, missions, showAgency, onClose, onOpenInvoice }) {
  const list = missions.filter(m => filter === 'all' ? true : filter === 'faits' ? m.done : !m.done)
  const total = list.reduce((n, m) => n + m.amount, 0)
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{LIST_TITLES[filter]}</h2>
            <p className="text-navy-100 text-xs">{list.length} facture{list.length > 1 ? 's' : ''} · {total}€</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
          {list.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Aucune facture ici pour l'instant.</p>}
          {list.map(m => {
            const pill = STATUS_PILL[m.status]
            return (
              <button key={m.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors" onClick={() => onOpenInvoice(m)}>
                <Receipt size={15} className="text-navy-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.boat}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {format(parseISO(m.date), 'EEE d MMM', { locale: fr })} · {m.client}{showAgency ? ` · ${m.agencyName}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${pill.cls}`}>{pill.label}</span>
                <p className="text-sm font-medium text-navy-900 flex-shrink-0 w-12 text-right">{m.amount}€</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CodeLogin({ onSuccess }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const provider = getProviderByAccessCode(code)
    if (!provider) { setError("Code invalide — vérifie-le auprès de l'agence.") ; return }
    onSuccess(provider.id)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #071E38 0%, #0D2F56 60%, #1A4A7A 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="font-display text-white text-2xl font-bold tracking-tight">Hel<span className="text-teal-200">mo</span></span>
          <p className="text-navy-100 text-xs mt-1">Espace prestataire ménage</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl p-5 shadow-xl flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Code d'accès</p>
            <input
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-navy-600 uppercase tracking-wide"
              placeholder="Ex : NICKEL-2026"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
            />
            {error && <p className="text-xs text-danger-600 mt-1.5">{error}</p>}
            <p className="text-[10px] text-gray-400 mt-1.5">Ce code t'est fourni par l'agence avec qui tu travailles.</p>
          </div>
          <button type="submit" className="btn-primary w-full justify-center py-2.5">Accéder à mon planning</button>
        </form>
      </div>
    </div>
  )
}

export default function MenageDashboard({ onLogout }) {
  const [providerId, setProviderId] = useState(null)
  const [view, setView] = useState('planning')
  const [reportTab, setReportTab] = useState('fait') // 'prevu' | 'fait' | 'regle'
  const [invoiceMission, setInvoiceMission] = useState(null)
  const [invoiceList, setInvoiceList] = useState(null) // null | 'all' | 'faits' | 'prevu'
  const [sharedState, setSharedState] = useState(getState())
  useEffect(() => subscribe(s => setSharedState(s)), [])

  if (!providerId) return <CodeLogin onSuccess={setProviderId} />

  const provider = MENAGE_PROVIDERS.find(p => p.id === providerId)
  const missions = getMissionsForProvider(providerId)
  const done = missions.filter(m => m.done).length
  const pct = missions.length ? Math.round((done / missions.length) * 100) : 0
  const agencyGroups = groupMissionsByAgency(missions)
  const multiAgency = agencyGroups.length > 1
  const REPORT_TABS = [
    { id: 'prevu', label: 'À venir' },
    { id: 'fait', label: 'En attente de paiement' },
    { id: 'regle', label: 'Réglés' },
  ]
  const owedTotal = missions.filter(m => m.status === 'fait').reduce((n, m) => n + m.amount, 0)
  const paidTotal = missions.filter(m => m.status === 'regle').reduce((n, m) => n + m.amount, 0)

  function weekGroups(items) {
    const groups = []
    items.forEach(m => {
      let g = groups[groups.length - 1]
      if (!g || g.weekStart !== m.weekStart) { g = { weekStart: m.weekStart, items: [] }; groups.push(g) }
      g.items.push(m)
    })
    return groups
  }

  function MissionRow({ m }) {
    const isFriday = m.heure === '17:30'
    // Un ménage déjà réglé ne se décoche plus.
    const toggle = () => { if (m.status !== 'regle') toggleMenageDone(m.key, { type: 'provider', name: provider.company }) }
    return (
      <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${m.done ? 'bg-teal-50 border-teal-100' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 cursor-pointer ${m.done ? 'bg-teal-400' : 'border-2 border-gray-300 bg-white'}`}
          onClick={toggle}
        >
          {m.done && <Check size={12} className="text-white" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={toggle}>
          <p className={`text-sm font-medium ${m.done ? 'text-teal-800' : 'text-gray-800'}`}>{m.boat}</p>
          <p className="text-xs text-gray-400">{m.client} · {format(parseISO(m.date), 'EEEE d MMM', { locale: fr })} · {m.heure}</p>
          {m.done && <p className="text-[10px] text-teal-700 mt-0.5">{m.status === 'regle' ? paidLabel(m) : doneByLabel(m)}</p>}
        </div>
        <button className="text-[10px] font-medium text-navy-600 bg-navy-50 px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1" onClick={() => setInvoiceMission(m)}>
          <Receipt size={10} /> Facture
        </button>
        {isFriday && !m.done && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">Vendredi soir</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-gray-50 print:h-auto print:overflow-visible">
      <aside className="w-56 bg-navy-900 flex flex-col flex-shrink-0 print:hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 py-4 border-b border-navy-800">
          <span className="font-display text-white text-lg font-bold tracking-tight">Hel<span className="text-teal-200">mo</span></span>
        </div>
        <div className="px-4 py-3 border-b border-navy-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center text-white flex-shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{provider.company}</p>
              <p className="text-[10px] text-navy-100 opacity-50">{provider.contact}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-navy-100 opacity-70"><Phone size={10} /> {provider.phone}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-navy-100 opacity-70 mt-0.5"><Mail size={10} /> {provider.email}</div>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${view === 'planning' ? 'bg-navy-800 text-white' : 'text-navy-100 hover:bg-navy-800'}`} onClick={() => setView('planning')}>
          <Calendar size={13} /> Mon planning
        </button>
        <button className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${view === 'rapport' ? 'bg-navy-800 text-white' : 'text-navy-100 hover:bg-navy-800'}`} onClick={() => setView('rapport')}>
          <Receipt size={13} /> Compte rendu
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 text-xs text-navy-100 hover:bg-navy-800 transition-colors" onClick={() => setProviderId(null)}>
          <ChevronLeft size={13} /> Changer de compte
        </button>
        </div>
        <div className="flex-shrink-0 border-t border-navy-800 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-navy-100 opacity-50">Sous-traitant</p>
          <button onClick={onLogout} className="text-navy-100 hover:text-white transition-colors p-1 rounded hover:bg-navy-800">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto print:overflow-visible">
        <div className="topbar bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between print:hidden">
          <div>
            <h1 className="font-display text-base font-bold">{view === 'planning' ? 'Mon planning ménage' : 'Compte rendu'}</h1>
            <p className="text-xs text-gray-400">{missions.length} mission{missions.length > 1 ? 's' : ''} · {pct}% faits</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost text-xs" onClick={() => window.print()}><Printer size={13} /> Imprimer</button>
          </div>
        </div>

        {view === 'planning' && missions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 px-6 pt-5 max-w-2xl print:hidden">
            {[
              { id: 'all', value: missions.length, label: 'missions au total', color: 'text-navy-900', border: 'border-gray-100 hover:bg-gray-50' },
              { id: 'faits', value: done, label: 'faits', color: 'text-teal-600', border: 'border-teal-100 hover:bg-teal-50' },
              { id: 'prevu', value: missions.length - done, label: 'restant à faire', color: 'text-amber-600', border: 'border-amber-100 hover:bg-amber-50' },
            ].map(c => (
              <button key={c.id} className={`bg-white rounded-xl border p-3.5 text-center transition-colors ${c.border}`} onClick={() => setInvoiceList(c.id)}>
                <p className={`font-display text-xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{c.label} · voir les factures →</p>
              </button>
            ))}
          </div>
        )}

        <div className="p-6 max-w-2xl">
          {view === 'planning' ? (
            missions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <p className="text-sm text-gray-400">Aucun ménage assigné pour le moment.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-7">
                {agencyGroups.map(ag => (
                  <div key={ag.agencyName}>
                    {multiAgency && (
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                        <Building2 size={14} className="text-navy-600" />
                        <p className="text-sm font-semibold text-navy-800">{ag.agencyName}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-6">
                      {weekGroups(ag.items).map(g => (
                        <div key={g.weekStart}>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                            Semaine du {format(parseISO(g.weekStart), 'd MMMM', { locale: fr })}
                          </p>
                          <div className="flex flex-col gap-2">
                            {g.items.map(m => <MissionRow key={m.key} m={m} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-amber-100 p-3.5">
                  <p className="font-display text-xl font-bold text-amber-600">{owedTotal}€</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">en attente de paiement</p>
                </div>
                <div className="bg-white rounded-xl border border-teal-100 p-3.5">
                  <p className="font-display text-xl font-bold text-teal-600">{paidTotal}€</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">déjà réglés</p>
                </div>
              </div>

              <div className="flex gap-1.5 print:hidden">
                {REPORT_TABS.map(t => (
                  <button key={t.id} onClick={() => setReportTab(t.id)} className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${reportTab === t.id ? 'bg-navy-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    {t.label} ({missions.filter(m => m.status === t.id).length})
                  </button>
                ))}
              </div>

              {agencyGroups.map(ag => {
                const items = ag.items.filter(m => m.status === reportTab)
                const total = items.reduce((n, m) => n + m.amount, 0)
                return (
                  <div key={ag.agencyName} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <Building2 size={14} className="text-navy-600" />
                      <p className="text-sm font-semibold text-navy-800 flex-1">{ag.agencyName}</p>
                      <p className="text-sm font-bold text-navy-900">{total}€</p>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-gray-400 px-4 py-4">Rien dans cette catégorie pour cette agence.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {items.map(m => (
                          <div key={m.key} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{m.boat}</p>
                              <p className="text-[11px] text-gray-400">
                                {format(parseISO(m.date), 'EEE d MMM', { locale: fr })} · {m.client}
                                {m.status === 'regle' && <> · <span className="text-teal-700">{paidLabel(m)}</span></>}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-navy-900 flex-shrink-0">{m.amount}€</p>
                            <button className="text-[10px] font-medium text-navy-600 bg-navy-50 px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1 print:hidden" onClick={() => setInvoiceMission(m)}>
                              <Receipt size={10} /> Facture
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {invoiceList && (
        <InvoiceListModal
          filter={invoiceList}
          missions={missions}
          showAgency={multiAgency}
          onClose={() => setInvoiceList(null)}
          onOpenInvoice={setInvoiceMission}
        />
      )}
      {invoiceMission && (
        <MenageInvoiceModal mission={invoiceMission} editable={false} onClose={() => setInvoiceMission(null)} />
      )}
    </div>
  )
}
