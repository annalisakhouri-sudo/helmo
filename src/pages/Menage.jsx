import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Sparkles, Phone, Mail, Check, ChevronRight, X, Copy, Receipt, CreditCard } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MENAGE_PROVIDERS } from '@/lib/mock-data'
import { getMissionsForProvider, getUnconfirmedMenages, doneByLabel, paidLabel } from '@/lib/menage-missions'
import { buildMenageInvoiceData } from '@/lib/menage-invoice'
import { getState, subscribe, toggleMenageDone, getMenageInvoice, markMenageInvoicePaid, sendMenageRequest, respondMenageRequest } from '@/lib/shared-state'
import { Card } from '@/components/ui'
import MenageInvoiceModal from '@/components/planning/MenageInvoiceModal'

const fmtDay = d => format(parseISO(d), 'EEE d MMM', { locale: fr })

function StatusPill({ m }) {
  if (m.status === 'regle') return <span className="pill-ok text-[10px] flex-shrink-0">Réglé</span>
  if (m.status === 'fait') return <span className="pill-warn text-[10px] flex-shrink-0">À régler</span>
  return null
}

// Règlement : en ligne (Stripe → réglé automatiquement) ou à la main (virement, chèque…).
function pay(m, via) {
  getMenageInvoice(m.key, buildMenageInvoiceData(m)) // crée la facture si elle n'a jamais été ouverte
  markMenageInvoicePaid(m.key, via)
}

// ── Liste des factures ménage : à régler / réglées ─────────────────
function PaymentsModal({ missions, onClose, onOpenInvoice }) {
  const [tab, setTab] = useState('a_regler')
  const list = missions.filter(m => (tab === 'a_regler' ? m.status === 'fait' : m.status === 'regle'))
  const total = list.reduce((n, m) => n + m.amount, 0)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Factures ménage</h2>
            <p className="text-navy-100 text-xs">{list.length} facture{list.length > 1 ? 's' : ''} · {total}€</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 pt-4 flex gap-1.5 flex-shrink-0">
          {[{ id: 'a_regler', label: 'À régler' }, { id: 'reglees', label: 'Réglées' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${tab === t.id ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-2">
          {list.length === 0 && (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400">{tab === 'a_regler' ? 'Rien à régler : aucun ménage fait en attente de paiement.' : 'Aucune facture réglée pour le moment.'}</p>
            </div>
          )}
          {list.map(m => (
            <div key={m.key} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.boat}</p>
                  <p className="text-xs text-gray-400">{m.providerName} · {fmtDay(m.date)} · {m.client}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.status === 'regle' ? paidLabel(m) : doneByLabel(m)}</p>
                </div>
                <p className="text-sm font-bold text-navy-900 flex-shrink-0">{m.amount}€</p>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button className="btn-ghost text-xs py-1" onClick={() => onOpenInvoice(m)}><Receipt size={12} /> Facture</button>
                {m.status === 'fait' && (
                  <>
                    <button className="btn-ghost text-xs py-1 ml-auto" onClick={() => pay(m, 'manuel')}><Check size={12} /> Marquer réglé</button>
                    <button className="btn-primary text-xs py-1" onClick={() => pay(m, 'stripe')} title="Démo : simule un paiement Stripe"><CreditCard size={12} /> Payer en ligne</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Fiche société : ses ménages, cochables par l'agence en rattrapage ─
function ProviderDetail({ provider, missions, onClose, onOpenInvoice }) {
  const [copied, setCopied] = useState(false)
  const groups = []
  missions.forEach(m => {
    let g = groups[groups.length - 1]
    if (!g || g.weekStart !== m.weekStart) { g = { weekStart: m.weekStart, items: [] }; groups.push(g) }
    g.items.push(m)
  })

  function copyCode() {
    navigator.clipboard?.writeText(provider.accessCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{provider.company}</h2>
            <p className="text-navy-100 text-xs">{provider.contact} · Société sous-traitante</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone size={12} /> {provider.phone}</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail size={12} /> {provider.email}</div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-navy-50">
          <p className="text-[10px] text-navy-600 uppercase tracking-wide font-medium mb-1">Code d'accès à transmettre au prestataire</p>
          <div className="flex items-center gap-2">
            <code className="text-sm font-bold text-navy-800 bg-white border border-navy-100 rounded-lg px-3 py-1.5 flex-1">{provider.accessCode}</code>
            <button className="btn-ghost text-xs" onClick={copyCode}><Copy size={12} /> {copied ? 'Copié !' : 'Copier'}</button>
          </div>
        </div>
        <div className="px-5 pt-3 flex-shrink-0">
          <p className="text-[11px] text-gray-400">La société coche elle-même depuis son accès. Tu peux cocher à sa place si elle a oublié : ce sera indiqué « marqué fait par l'agence ».</p>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {missions.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center"><p className="text-sm text-gray-400">Aucun ménage assigné pour le moment.</p></div>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map(g => (
                <div key={g.weekStart}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Semaine du {format(parseISO(g.weekStart), 'd MMMM', { locale: fr })}
                  </p>
                  <div className="flex flex-col gap-2">
                    {g.items.map(m => (
                      <div key={m.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${m.done ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-100'}`}>
                        <button
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-teal-400' : 'border-2 border-gray-300 bg-white'} ${m.status === 'regle' ? 'opacity-60 cursor-not-allowed' : ''}`}
                          disabled={m.status === 'regle'}
                          title={m.status === 'regle' ? 'Déjà réglé' : m.done ? 'Annuler' : 'Marquer le ménage comme fait'}
                          onClick={() => toggleMenageDone(m.key, { type: 'agency', name: "l'agence" })}
                        >
                          {m.done && <Check size={12} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${m.done ? 'text-teal-800' : 'text-gray-800'}`}>{m.boat}</p>
                          <p className="text-xs text-gray-400">{m.client} · {fmtDay(m.date)} · {m.heure}</p>
                          {m.done && <p className="text-[10px] text-teal-700 mt-0.5">{m.status === 'regle' ? paidLabel(m) : doneByLabel(m)}</p>}
                        </div>
                        <StatusPill m={m} />
                        <button className="text-[10px] font-medium text-navy-600 bg-navy-50 px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1" onClick={() => onOpenInvoice(m)}>
                          <Receipt size={10} /> Facture
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Menage() {
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }
  const [, setSharedState] = useState(getState())
  const [selected, setSelected] = useState(null)
  const [showPayments, setShowPayments] = useState(false)
  const [invoiceMission, setInvoiceMission] = useState(null)
  useEffect(() => subscribe(s => setSharedState(s)), [])

  // Uniquement les ménages de la marque active.
  const providers = MENAGE_PROVIDERS.map(p => ({
    ...p,
    missions: getMissionsForProvider(p.id).filter(m => m.agencyBrand === activeBrand).map(m => ({ ...m, providerName: p.company })),
  }))
  const selectedProvider = providers.find(p => p.id === selected)
  const allMissions = providers.flatMap(p => p.missions)
  const upcoming = allMissions.filter(m => m.status === 'prevu')
  const toPay = allMissions.filter(m => m.status === 'fait')
  const toPayAmount = toPay.reduce((n, m) => n + m.amount, 0)
  // Garde la facture ouverte à jour (montant, statut) quand l'état change.
  const unconfirmed = getUnconfirmedMenages(activeBrand)
  const liveInvoiceMission = invoiceMission && allMissions.find(m => m.key === invoiceMission.key)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Ménage</h1>
          <p className="text-xs text-gray-400">{providers.length} prestataire{providers.length > 1 ? 's' : ''} sous-traitant{providers.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="text-gray-500"><strong className="text-navy-900">{upcoming.length}</strong> à venir</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500"><strong className="text-teal-600">{allMissions.length - upcoming.length}</strong> faits</span>
          <button className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100" onClick={() => setShowPayments(true)}>
            <Receipt size={12} /> {toPayAmount}€ à régler · {toPay.length} facture{toPay.length > 1 ? 's' : ''} →
          </button>
        </div>

        {unconfirmed.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">En attente de confirmation ({unconfirmed.length})</p>
            <div className="flex flex-col gap-2">
              {unconfirmed.map(m => (
                <div key={m.key} className={`rounded-xl border p-3 flex items-center gap-3 ${m.requestStatus === 'refusee' ? 'border-danger-100 bg-danger-50' : 'border-amber-100 bg-amber-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.boat} <span className="text-xs font-normal text-gray-500">· {fmtDay(m.date)} · {m.client}</span></p>
                    <p className={`text-[11px] ${m.requestStatus === 'refusee' ? 'text-danger-700' : 'text-amber-700'}`}>
                      {m.requestStatus === 'refusee' ? `${m.providerName} a refusé — choisis une autre société` : `Demande et facture (${m.amount}€) envoyées à ${m.providerName} · en attente de sa réponse`}
                    </p>
                  </div>
                  {m.requestStatus === 'refusee' ? (
                    <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" defaultValue="" onChange={e => e.target.value && sendMenageRequest(m.bookingId, e.target.value)}>
                      <option value="">Renvoyer à…</option>
                      {MENAGE_PROVIDERS.filter(p => p.id !== m.providerId).map(p => <option key={p.id} value={p.id}>{p.company}</option>)}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-gray-400">Démo :</span>
                      <button className="text-[10px] font-medium px-2 py-1 rounded-full bg-white text-teal-700 border border-teal-100" onClick={() => respondMenageRequest(m.bookingId, true)}>elle accepte</button>
                      <button className="text-[10px] font-medium px-2 py-1 rounded-full bg-white text-gray-500 border border-gray-200" onClick={() => respondMenageRequest(m.bookingId, false)}>elle refuse</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Card className="divide-y divide-gray-50">
          {providers.map(p => {
            const done = p.missions.filter(m => m.done).length
            const owed = p.missions.filter(m => m.status === 'fait').reduce((n, m) => n + m.amount, 0)
            const pct = p.missions.length ? Math.round((done / p.missions.length) * 100) : 0
            return (
              <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors" onClick={() => setSelected(p.id)}>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.company}</p>
                    <span className="pill-blue text-[9px]">Sous-traitant</span>
                  </div>
                  <p className="text-xs text-gray-400">{p.contact} · {done}/{p.missions.length} faits{owed > 0 ? ` · ${owed}€ à régler` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${pct === 100 ? 'text-teal-600' : 'text-gray-500'}`}>{pct}%</p>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-teal-400' : 'bg-navy-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </div>
            )
          })}
        </Card>
      </div>

      {selectedProvider && (
        <ProviderDetail provider={selectedProvider} missions={selectedProvider.missions} onClose={() => setSelected(null)} onOpenInvoice={setInvoiceMission} />
      )}
      {showPayments && <PaymentsModal missions={allMissions} onClose={() => setShowPayments(false)} onOpenInvoice={setInvoiceMission} />}
      {liveInvoiceMission && <MenageInvoiceModal mission={liveInvoiceMission} editable onClose={() => setInvoiceMission(null)} />}
    </div>
  )
}
