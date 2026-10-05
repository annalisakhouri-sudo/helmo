import { useState, useEffect } from 'react'
import { X, ChevronRight, LogOut, Sparkles, Check, ChevronLeft, Phone, Mail, Printer, Receipt, Calendar, Building2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MENAGE_PROVIDERS } from '@/lib/mock-data'
import { getMissionsForProvider, getPendingRequestsForProvider, getProviderByAccessCode, groupMissionsByAgency, doneByLabel, paidLabel, invoiceLabel } from '@/lib/menage-missions'
import { getState, subscribe, toggleMenageDone, respondMenageRequest } from '@/lib/shared-state'
import MenageInvoiceModal from '@/components/planning/MenageInvoiceModal'

function CodeLogin({ onSuccess, onBack }) {
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
        <button type="button" onClick={onBack} className="block mx-auto mt-4 text-xs text-navy-100 hover:text-white">← Retour au menu</button>
      </div>
    </div>
  )
}

export default function MenageDashboard({ onLogout }) {
  const [providerId, setProviderId] = useState(null)
  const [filter, setFilter] = useState('prevu') // 'prevu' | 'fait' | 'recue' | 'regle'
  const [detailKey, setDetailKey] = useState(null)
  const [toast, setToast] = useState(null)
  const [invoiceMission, setInvoiceMission] = useState(null)
  const [sharedState, setSharedState] = useState(getState())
  useEffect(() => subscribe(s => setSharedState(s)), [])

  if (!providerId) return <CodeLogin onSuccess={setProviderId} onBack={onLogout} />

  const provider = MENAGE_PROVIDERS.find(p => p.id === providerId)
  const missions = getMissionsForProvider(providerId)
  const pendingRequests = getPendingRequestsForProvider(providerId)
  const done = missions.filter(m => m.done).length
  const pct = missions.length ? Math.round((done / missions.length) * 100) : 0
  const agencyGroups = groupMissionsByAgency(missions)
  const multiAgency = agencyGroups.length > 1
  // C'est la société qui facture l'agence : ménage fait → elle envoie sa facture → l'agence la paie.
  const FILTERS = [
    { id: 'prevu', label: 'À venir' },
    { id: 'fait', label: 'À facturer' },
    { id: 'recue', label: 'Envoyées' },
    { id: 'regle', label: 'Payées' },
  ]
  const counts = { prevu: 0, fait: 0, recue: 0, regle: 0 }
  missions.forEach(m => { counts[m.status]++ })
  const filtered = missions.filter(m => m.status === filter)
  const owedTotal = missions.filter(m => m.status === 'recue').reduce((n, m) => n + m.amount, 0)
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

  // Cocher « fait » range le ménage dans « À régler » : on le dit, avec un Annuler.
  function toggleDone(m) {
    if (m.status === 'regle' || m.status === 'recue') return // facture envoyée ou payée : le ménage ne se décoche plus
    const wasDone = m.done
    toggleMenageDone(m.key, { type: 'provider', name: provider.company })
    setToast({ key: m.key, text: wasDone ? `${m.boat} : remis dans « À venir »` : `${m.boat} : fait ✓ — rangé dans « À facturer »` })
    clearTimeout(window.__menageToast)
    window.__menageToast = setTimeout(() => setToast(null), 5000)
  }

  function MissionRow({ m }) {
    const isFriday = m.heure === '17:30'
    return (
      <div className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${m.done ? 'bg-teal-50 border-teal-100' : 'bg-white border-gray-100 hover:border-navy-200'}`} onClick={() => setDetailKey(m.key)}>
        <button
          title={m.status === 'regle' ? 'Déjà réglé' : m.done ? 'Annuler' : 'Marquer comme fait'}
          className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-teal-400' : 'border-2 border-gray-300 bg-white hover:border-teal-400'}`}
          onClick={e => { e.stopPropagation(); toggleDone(m) }}
        >
          {m.done && <Check size={13} className="text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${m.done ? 'text-teal-800' : 'text-gray-800'}`}>{m.boat}</p>
          <p className="text-xs text-gray-400">{m.client} · {format(parseISO(m.date), 'EEEE d MMM', { locale: fr })} · {m.heure}</p>
          {m.done && <p className="text-[10px] text-teal-700 mt-0.5">{m.status === 'fait' ? doneByLabel(m) : invoiceLabel(m)}</p>}
        </div>
        {isFriday && !m.done && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full flex-shrink-0">Vendredi soir</span>
        )}
        {m.status === 'fait' && (
          <button className="text-[11px] font-medium text-white bg-navy-600 px-2.5 py-1 rounded-full flex-shrink-0 flex items-center gap-1" onClick={e => { e.stopPropagation(); setInvoiceMission(m) }}>
            <Receipt size={11} /> Envoyer ma facture
          </button>
        )}
        <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
      </div>
    )
  }

  const detail = detailKey && [...missions, ...pendingRequests].find(m => m.key === detailKey)
  const liveInvoice = invoiceMission && missions.find(m => m.key === invoiceMission.key)

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
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs bg-navy-800 text-white">
          <Calendar size={13} /> Mes ménages
        </div>
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
            <h1 className="font-display text-base font-bold">Mes ménages</h1>
            <p className="text-xs text-gray-400">{counts.prevu} à venir{counts.fait > 0 && <> · <span className="text-navy-700 font-medium">{counts.fait} facture{counts.fait > 1 ? 's' : ''} à envoyer</span></>} · <span className="text-amber-700">{owedTotal}€ en attente de paiement</span> · <span className="text-teal-700">{paidTotal}€ payés</span></p>
          </div>
          <button className="btn-ghost text-xs" onClick={() => window.print()}><Printer size={13} /> Imprimer</button>
        </div>

        {pendingRequests.length > 0 && (
          <div className="px-6 pt-5 max-w-2xl print:hidden">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-2">Nouvelles demandes à confirmer ({pendingRequests.length})</p>
            <div className="flex flex-col gap-2">
              {pendingRequests.map(m => (
                <div key={m.key} className="rounded-xl border p-3.5" style={{ borderColor: '#FAC775', background: '#FFFBF3' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.boat}</p>
                      <p className="text-xs text-gray-500">{m.agencyName} · {format(parseISO(m.date), 'EEEE d MMM', { locale: fr })} · {m.heure} · {m.client}</p>
                    </div>
                    <p className="text-sm font-bold text-navy-900 flex-shrink-0">{m.amount}€</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="text-[11px] text-gray-500 self-center">Tarif proposé : {m.amount}€ · tu factureras après le ménage</span>
                    <button className="btn-ghost text-xs py-1 ml-auto" onClick={() => respondMenageRequest(m.bookingId, false)}><X size={12} /> Refuser</button>
                    <button className="btn-primary text-xs py-1" onClick={() => respondMenageRequest(m.bookingId, true)}><Check size={12} /> Accepter</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Un seul écran, trois filtres : à faire → à se faire payer → réglé */}
        <div className="flex gap-1.5 px-6 pt-5 max-w-2xl print:hidden">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === f.id ? 'bg-navy-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>

        <div className="p-6 pt-4 max-w-2xl">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <p className="text-sm text-gray-400">{filter === 'prevu' ? 'Aucun ménage à venir.' : filter === 'fait' ? 'Aucune facture à envoyer.' : filter === 'recue' ? "Aucune facture en attente de paiement." : 'Aucun ménage payé pour le moment.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {filter !== 'prevu' && (
                <p className="text-xs text-gray-500">Total : <strong className="text-navy-900">{filtered.reduce((n, m) => n + m.amount, 0)}€</strong></p>
              )}
              {weekGroups(filtered).map(g => (
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
          )}
        </div>
      </main>

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6 print:hidden" onClick={() => setDetailKey(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-navy-900 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-white text-base font-bold">{detail.boat}</h2>
                <p className="text-navy-100 text-xs capitalize">{format(parseISO(detail.date), 'EEEE d MMMM', { locale: fr })} · {detail.heure}</p>
              </div>
              <button onClick={() => setDetailKey(null)} className="text-navy-100 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-2">
              {[['Agence', detail.agencyName], ['Client sortant', detail.client], ['Montant', `${detail.amount}€`],
                ['Statut', !detail.done ? 'À faire' : detail.status === 'fait' ? 'Fait · facture à envoyer' : invoiceLabel(detail)]].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-400">{k}</span><span className="font-medium text-right">{v}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <button className="btn-ghost flex-1 justify-center text-xs" onClick={() => setInvoiceMission(detail)}><Receipt size={13} /> {detail.status === 'fait' ? 'Envoyer ma facture' : 'Ma facture'}</button>
                {!['regle', 'recue'].includes(detail.status) && (
                  <button className={`flex-1 justify-center text-xs ${detail.done ? 'btn-ghost' : 'btn-primary'}`} onClick={() => { toggleDone(detail); setDetailKey(null) }}>
                    <Check size={13} /> {detail.done ? 'Annuler « fait »' : 'Marquer comme fait'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-navy-900 text-white text-sm rounded-xl shadow-lg px-4 py-3 flex items-center gap-4 print:hidden">
          <span>{toast.text}</span>
          <button className="text-teal-200 font-medium text-xs" onClick={() => { toggleMenageDone(toast.key, { type: 'provider', name: provider.company }); setToast(null) }}>Annuler</button>
        </div>
      )}

      {invoiceMission && (
        <MenageInvoiceModal mission={liveInvoice || invoiceMission} side="provider" onClose={() => setInvoiceMission(null)} />
      )}
    </div>
  )
}
