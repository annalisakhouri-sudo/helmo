import { useState, useEffect } from 'react'
import { Sparkles, Phone, Mail, Check, ChevronRight, X, Building2, Copy, Receipt } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MENAGE_PROVIDERS } from '@/lib/mock-data'
import { getMissionsForProvider } from '@/lib/menage-missions'
import { getState, subscribe, toggleMenageDone } from '@/lib/shared-state'
import { Card, SectionLabel } from '@/components/ui'
import MenageInvoiceModal from '@/components/planning/MenageInvoiceModal'

function ProviderDetail({ provider, missions, onClose }) {
  const [invoiceMission, setInvoiceMission] = useState(null)
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
          <p className="text-[10px] text-navy-500 mt-1.5">Avec ce code, le prestataire accède à son propre planning depuis /login → Ménage.</p>
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
                      <div
                        key={m.key}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${m.done ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 cursor-pointer ${m.done ? 'bg-teal-400' : 'border-2 border-gray-300 bg-white'}`}
                          onClick={() => toggleMenageDone(m.key)}
                        >
                          {m.done && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleMenageDone(m.key)}>
                          <p className={`text-sm font-medium ${m.done ? 'text-teal-800 line-through opacity-70' : 'text-gray-800'}`}>{m.boat}</p>
                          <p className="text-xs text-gray-400">{m.client} · {format(parseISO(m.date), 'EEE d MMM', { locale: fr })} · {m.heure}</p>
                        </div>
                        <button className="text-[10px] font-medium text-navy-600 bg-navy-50 px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1" onClick={() => setInvoiceMission(m)}>
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

      {invoiceMission && (
        <MenageInvoiceModal mission={invoiceMission} editable onClose={() => setInvoiceMission(null)} />
      )}
    </div>
  )
}

export default function Menage() {
  const [sharedState, setSharedState] = useState(getState())
  const [selected, setSelected] = useState(null)
  useEffect(() => subscribe(s => setSharedState(s)), [])

  const providers = MENAGE_PROVIDERS.map(p => ({ ...p, missions: getMissionsForProvider(p.id) }))
  const selectedProvider = providers.find(p => p.id === selected)
  const allMissions = providers.flatMap(p => p.missions)
  const totalDone = allMissions.filter(m => m.done).length
  const pendingRevenue = allMissions.filter(m => !m.done).reduce((sum, m) => sum + m.price, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Ménage</h1>
          <p className="text-xs text-gray-400">{providers.length} prestataire{providers.length > 1 ? 's' : ''} sous-traitant{providers.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
            <p className="font-display text-xl font-bold text-navy-900">{allMissions.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">missions au total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
            <p className="font-display text-xl font-bold text-teal-600">{totalDone}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">confirmées faites</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-center">
            <p className="font-display text-xl font-bold text-amber-600">{pendingRevenue}€</p>
            <p className="text-[10px] text-gray-400 mt-0.5">à régler (estimé)</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-navy-100 bg-navy-50 p-3 flex items-center gap-2.5">
          <Building2 size={14} className="text-navy-600 flex-shrink-0" />
          <p className="text-xs text-navy-700">Le ménage est géré par des sociétés externes avec leur propre accès (code dédié) — en temps réel avec ce que tu vois ici.</p>
        </div>

        <Card className="divide-y divide-gray-50">
          {providers.map(p => {
            const done = p.missions.filter(m => m.done).length
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
                  <p className="text-xs text-gray-400">{p.contact} · {p.missions.length} mission{p.missions.length > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${pct === 100 ? 'text-teal-600' : 'text-gray-500'}`}>{pct}%</p>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-teal-400' : 'bg-amber-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </div>
            )
          })}
        </Card>
      </div>

      {selectedProvider && (
        <ProviderDetail provider={selectedProvider} missions={selectedProvider.missions} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
