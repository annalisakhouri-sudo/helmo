import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, AlertTriangle, Euro } from 'lucide-react'
import { getMaintenanceTasks, subscribe } from '@/lib/shared-state'

// Cette fiche est celle de l'EXTRANET AGENCE : lecture seule, juste une vision globale
// de l'avancement du technicien. Le détail éditable (checklist, notes, prix des écarts)
// se remplit côté app technicien, pas ici.
export const CHECKLIST = [
  { category: '🔴 Sécurité', items: [
    { id: 's1', label: 'Gilets de sauvetage', max: 8 },
    { id: 's2', label: 'Fusées de détresse', max: 6 },
    { id: 's3', label: 'Extincteur', max: 2 },
    { id: 's4', label: 'Trousse premiers secours', max: 1 },
  ]},
  { category: '🍽 Cuisine', items: [
    { id: 'c1', label: 'Assiettes', max: 8 },
    { id: 'c2', label: 'Verres', max: 8 },
    { id: 'c3', label: 'Fourchettes', max: 8 },
    { id: 'c4', label: 'Couteaux', max: 8 },
  ]},
  { category: '🛏 Cabines', items: [
    { id: 'b1', label: 'Oreillers', max: 8 },
    { id: 'b2', label: 'Couvertures', max: 6 },
  ]},
  { category: '⚓ Nautique', items: [
    { id: 'n1', label: 'Jerricane carburant', max: 2 },
    { id: 'n2', label: 'Fenders', max: 6 },
    { id: 'n3', label: 'Pagaies SUP', max: 2 },
  ]},
]
export const ALL_ITEMS = CHECKLIST.flatMap(c => c.items)

function ProgressCard({ icon: Icon, iconBg, title, subtitle, pct, complete }) {
  return (
    <div className="card mb-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            {complete && <span className="pill-ok text-[10px]">OK ✓</span>}
          </div>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <p className="text-sm font-semibold flex-shrink-0" style={{ color: complete ? '#0F7D57' : '#854F0B' }}>{pct}%</p>
      </div>
      <div className="bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: complete ? '#1D9E75' : '#EF9F27' }} />
      </div>
    </div>
  )
}

export default function MaintenanceModal({ booking, nextBooking, boat, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  // Check-out d'ARRIVÉE (retour du client actuel), comparé à son check-in de départ d'origine.
  const arrivalStored = getMaintenanceTasks(booking.id, ALL_ITEMS.map(i => ({ id: i.id, qty: i.max, max: i.max })), [])
  const departureQuantities = {}
  arrivalStored.arrival.forEach(t => { departureQuantities[t.id] = t.max })
  const arrivalQuantities = {}
  arrivalStored.arrival.forEach(t => { arrivalQuantities[t.id] = t.qty })
  const anomalyDetails = arrivalStored.anomalyDetails || {}

  // Check-in de DÉPART pour le prochain client — vision globale seulement, pas de détail.
  const departureStored = nextBooking ? getMaintenanceTasks(nextBooking.id, ALL_ITEMS.map(i => ({ id: i.id, qty: 0, max: i.max })), []) : null
  const newCheckinQuantities = {}
  if (departureStored) departureStored.arrival.forEach(t => { newCheckinQuantities[t.id] = t.qty })

  // Écarts non écartés par le technicien (une anomalie "dismissed" = fausse alerte, on ne l'affiche plus)
  const missingItems = ALL_ITEMS.filter(i => {
    const gap = (departureQuantities[i.id] ?? i.max) - (arrivalQuantities[i.id] ?? i.max)
    return gap > 0 && !anomalyDetails[i.id]?.dismissed
  })

  const arrivalCompleteCount = ALL_ITEMS.filter(i => arrivalQuantities[i.id] === departureQuantities[i.id] || anomalyDetails[i.id]?.dismissed).length
  const arrivalPct = Math.round((arrivalCompleteCount / ALL_ITEMS.length) * 100)
  const arrivalComplete = missingItems.length === 0

  const departureDone = nextBooking ? ALL_ITEMS.filter(i => newCheckinQuantities[i.id] === i.max).length : 0
  const departurePct = nextBooking ? Math.round((departureDone / ALL_ITEMS.length) * 100) : 0
  const departureComplete = nextBooking ? departureDone === ALL_ITEMS.length : false

  const totalCost = missingItems.reduce((sum, i) => sum + (Number(anomalyDetails[i.id]?.price) || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Maintenance technicien</h2>
            <p className="text-navy-100 text-xs">{boat?.name || booking.boatName}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <p className="text-xs text-gray-400 mb-4">
            Préparation entre <strong>{booking.client}</strong> ({booking.end}) et {nextBooking ? <strong>{nextBooking.client}</strong> : 'le prochain client'}.
            {' '}Détail rempli par le technicien sur son app — vue d'ensemble ici.
          </p>

          <ProgressCard
            icon={ArrowUpRight}
            iconBg="#0F7D57"
            title={`Arrivée — ${booking.client}`}
            subtitle="Check-out vs check-in de départ"
            pct={arrivalPct}
            complete={arrivalComplete}
          />

          {missingItems.length > 0 && (
            <div className="mb-4">
              <p className="section-label">Écarts signalés</p>
              <div className="flex flex-col gap-1.5">
                {missingItems.map(i => {
                  const detail = anomalyDetails[i.id] || {}
                  const gap = (departureQuantities[i.id] ?? i.max) - (arrivalQuantities[i.id] ?? i.max)
                  return (
                    <div key={i.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-danger-50 border border-danger-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={12} className="text-danger-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-danger-800 truncate">{gap} {i.label.toLowerCase()} manquant{gap > 1 ? 's' : ''}</p>
                          {detail.note && <p className="text-[10px] text-danger-600 truncate">{detail.note}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-danger-700 flex-shrink-0 flex items-center gap-0.5">
                        {detail.price ? <>{detail.price}€</> : <span className="text-[10px] text-danger-400 font-normal">prix non renseigné</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              {totalCost > 0 && (
                <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Euro size={12} /> Total à retenir sur caution</span>
                  <span className="text-sm font-bold text-danger-700">{totalCost}€</span>
                </div>
              )}
            </div>
          )}

          {nextBooking && (
            <ProgressCard
              icon={ArrowDownLeft}
              iconBg="#1B4F8A"
              title={`Départ — ${nextBooking.client}`}
              subtitle={`Check-in à remplir · ${departureDone}/${ALL_ITEMS.length}`}
              pct={departurePct}
              complete={departureComplete}
            />
          )}
          {!nextBooking && (
            <p className="text-sm text-gray-400 text-center py-4">Aucune location ne démarre directement après celle-ci.</p>
          )}
        </div>
      </div>
    </div>
  )
}
