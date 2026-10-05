import { useState, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, AlertTriangle, Euro, Sparkles, Wrench, ChevronDown } from 'lucide-react'
import { getMaintenanceTasks, subscribe, getState } from '@/lib/shared-state'
import { OPTIONS_CATALOG, TECHNICIANS } from '@/lib/mock-data'
import { buildAllMenageMissions, doneByLabel, paidLabel } from '@/lib/menage-missions'
import { buildAllMissions, getMissionTasks } from '@/lib/tech-missions'
import { fmtDate } from '@/lib/dates'

// Cette fiche est celle de l'EXTRANET AGENCE : lecture seule, juste une vision globale
// de l'avancement du technicien. Le détail éditable (checklist, notes, prix des écarts)
// se remplit côté app technicien, pas ici.
//
// La checklist s'adapte au bateau (capacité, lits, type) et aux options/draps réellement
// pris sur cette location — un semi-rigide n'a pas de cabines à vérifier, un catamaran
// 12 personnes n'a pas la même vaisselle qu'un voilier 8 personnes.
export function buildChecklist(boat, booking) {
  const capacite = boat?.capacite || 8
  const cabines = boat?.cabines ?? 3
  const lits = boat?.lits ?? (cabines * 2)
  const isDayBoat = cabines === 0

  const sections = [
    { category: 'Sécurité', items: isDayBoat ? [
      { id: 's1', label: 'Gilets de sauvetage', max: capacite },
      { id: 's3', label: 'Extincteur', max: 1 },
      { id: 's4', label: 'Trousse premiers secours', max: 1 },
    ] : [
      { id: 's1', label: 'Gilets de sauvetage', max: capacite },
      { id: 's2', label: 'Fusées de détresse', max: 6 },
      { id: 's3', label: 'Extincteur', max: 2 },
      { id: 's4', label: 'Trousse premiers secours', max: 1 },
    ]},
  ]

  if (!isDayBoat) {
    sections.push({ category: 'Cuisine', items: [
      { id: 'c1', label: 'Assiettes', max: capacite },
      { id: 'c2', label: 'Verres', max: capacite },
      { id: 'c3', label: 'Fourchettes', max: capacite },
      { id: 'c4', label: 'Couteaux', max: capacite },
    ]})
    sections.push({ category: 'Cabines', items: [
      { id: 'b1', label: 'Oreillers', max: lits },
      { id: 'b2', label: 'Couvertures', max: lits },
    ]})
  }

  sections.push({ category: 'Nautique', items: isDayBoat ? [
    { id: 'n1', label: 'Jerricane carburant', max: 1 },
    { id: 'n2', label: 'Fenders', max: 4 },
  ] : [
    { id: 'n1', label: 'Jerricane carburant', max: 2 },
    { id: 'n2', label: 'Fenders', max: 6 },
    { id: 'n5', label: 'Annexe (gonflée, sans fuite)', max: 1 },
    { id: 'n6', label: 'Moteur hors-bord annexe', max: 1 },
  ]})

  const dynamicItems = []
  ;(booking?.draps || []).forEach((d, i) => dynamicItems.push({ id: `drap-${i}`, label: `Draps — ${d.name} × ${d.qty} ${d.unit}`, max: d.qty }))
  Object.entries(booking?.options || {}).forEach(([optId, val]) => {
    if (!val) return
    const opt = OPTIONS_CATALOG.find(o => o.id === optId)
    if (!opt) return
    const qty = typeof val === 'object' ? val.qty : 1
    dynamicItems.push({ id: `opt-${optId}`, label: qty > 1 ? `${opt.label} × ${qty}` : opt.label, max: qty })
  })
  if (dynamicItems.length > 0) {
    sections.push({ category: 'Draps & options de cette location', items: dynamicItems })
  }

  return sections
}

function ProgressCard({ icon: Icon, iconBg, title, subtitle, pct, complete, details }) {
  const [open, setOpen] = useState(false)
  // Une fois à 100 %, le détail devient consultable d'un clic.
  const canOpen = complete && details && details.length > 0
  return (
    <div className={`card mb-3 ${canOpen ? 'cursor-pointer hover:border-teal-200' : ''}`} onClick={() => canOpen && setOpen(o => !o)}>
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
      {canOpen && (
        <p className="text-[11px] text-teal-700 mt-2 flex items-center gap-1">{open ? 'Masquer' : 'Consulter'} le détail <ChevronDown size={11} className={open ? 'rotate-180' : ''} /></p>
      )}
      {open && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1">
          {details.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{d.label}</span>
              <span className="text-teal-700 font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MaintenanceModal({ booking, nextBooking, boat, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const ARRIVAL_ITEMS = buildChecklist(boat, booking).flatMap(c => c.items)
  const DEPARTURE_ITEMS = nextBooking ? buildChecklist(boat, nextBooking).flatMap(c => c.items) : []

  // Check-out d'ARRIVÉE (retour du client actuel), comparé à son check-in de départ d'origine.
  const arrivalStored = getMaintenanceTasks(booking.id, ARRIVAL_ITEMS.map(i => ({ id: i.id, qty: i.max, max: i.max })), [])
  const departureQuantities = {}
  arrivalStored.arrival.forEach(t => { departureQuantities[t.id] = t.max })
  const arrivalQuantities = {}
  arrivalStored.arrival.forEach(t => { arrivalQuantities[t.id] = t.qty })
  const anomalyDetails = arrivalStored.anomalyDetails || {}

  // Check-in de DÉPART pour le prochain client — vision globale seulement, pas de détail.
  const departureStored = nextBooking ? getMaintenanceTasks(nextBooking.id, DEPARTURE_ITEMS.map(i => ({ id: i.id, qty: 0, max: i.max })), []) : null
  const newCheckinQuantities = {}
  if (departureStored) departureStored.arrival.forEach(t => { newCheckinQuantities[t.id] = t.qty })

  // Écarts non écartés par le technicien (une anomalie "dismissed" = fausse alerte, on ne l'affiche plus)
  const missingItems = ARRIVAL_ITEMS.filter(i => {
    const gap = (departureQuantities[i.id] ?? i.max) - (arrivalQuantities[i.id] ?? i.max)
    return gap > 0 && !anomalyDetails[i.id]?.dismissed
  })

  const arrivalCompleteCount = ARRIVAL_ITEMS.filter(i => arrivalQuantities[i.id] === departureQuantities[i.id] || anomalyDetails[i.id]?.dismissed).length
  const arrivalPct = Math.round((arrivalCompleteCount / ARRIVAL_ITEMS.length) * 100)
  const arrivalComplete = missingItems.length === 0

  const departureDone = nextBooking ? DEPARTURE_ITEMS.filter(i => newCheckinQuantities[i.id] === i.max).length : 0
  const departurePct = nextBooking ? Math.round((departureDone / DEPARTURE_ITEMS.length) * 100) : 0
  const departureComplete = nextBooking ? departureDone === DEPARTURE_ITEMS.length : false

  const totalCost = missingItems.reduce((sum, i) => sum + (Number(anomalyDetails[i.id]?.price) || 0), 0)

  // Ménage rattaché à ce créneau (celui de la location qui se termine).
  const menage = buildAllMenageMissions().find(m => m.bookingId === booking.id)
  // Jauges techniciens : retour du client actuel + préparation du suivant.
  const allMissions = buildAllMissions()
  const techGauge = key => {
    const m = allMissions.find(x => x.key === key)
    if (!m) return null
    const tech = TECHNICIANS.find(t => t.id === m.techId)
    const tasks = tech ? getMissionTasks(tech, m) : []
    const done = tasks.filter(t => t.done).length
    return { m, tech, tasks, done, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
  }
  const gauges = [techGauge(`ret-${booking.id}`), nextBooking && techGauge(`dep-${nextBooking.id}`)].filter(Boolean)
  const clientCheckIn = nextBooking ? getState().checkIns[nextBooking.id] : null

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
            Préparation entre <strong>{booking.client}</strong> ({fmtDate(booking.end)}) et {nextBooking ? <strong>{nextBooking.client}</strong> : 'le prochain client'}.

          </p>

          <p className="section-label">Ménage</p>
          {menage ? (
            <div className={`card-sm mb-4 flex items-center gap-3 ${menage.done ? 'bg-teal-50 border border-teal-100' : ''}`}>
              <Sparkles size={15} className={menage.done ? 'text-teal-600' : 'text-gray-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{menage.providerName}</p>
                <p className="text-[11px] text-gray-500">
                  {menage.requestStatus === 'a_confirmer' ? 'Demande envoyée · en attente de confirmation'
                    : menage.requestStatus === 'refusee' ? 'Refusé · choisir une autre société (page Ménage)'
                    : menage.status === 'regle' ? paidLabel(menage)
                    : menage.done ? doneByLabel(menage)
                    : `Prévu ${fmtDate(menage.date)} à ${menage.heure}`}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${menage.done ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>{menage.done ? 'Fait' : menage.requestStatus === 'acceptee' ? 'Prévu' : 'À confirmer'}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-4">Pas d'option ménage : le nettoyage est fait par le technicien.</p>
          )}

          <p className="section-label">Technicien</p>
          {gauges.map(g => (
            <ProgressCard
              key={g.m.key}
              icon={Wrench}
              iconBg={g.m.type === 'retour' ? '#0F7D57' : '#1B4F8A'}
              title={`${g.m.type === 'retour' ? 'Retour' : 'Départ'} — ${g.tech?.name || 'à réassigner'}`}
              subtitle={`${fmtDate(g.m.date)} · ${g.done}/${g.tasks.length} tâches`}
              pct={g.pct}
              complete={g.tasks.length > 0 && g.done === g.tasks.length}
              details={g.tasks.map(t => ({ label: t.label, value: t.done ? '✓' : '—' }))}
            />
          ))}

          <p className="section-label mt-2">Inventaire</p>
          <ProgressCard
            icon={ArrowUpRight}
            iconBg="#0F7D57"
            title={`Check-out — ${booking.client}`}
            subtitle="Retour comparé au check-in de départ"
            pct={arrivalPct}
            complete={arrivalComplete}
            details={ARRIVAL_ITEMS.map(i => ({ label: i.label, value: `${arrivalQuantities[i.id] ?? i.max}/${departureQuantities[i.id] ?? i.max}` }))}
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
              title={`Check-in — ${nextBooking.client}`}
              subtitle={clientCheckIn?.done ? 'Check-in client signé' : `À remplir · ${departureDone}/${DEPARTURE_ITEMS.length}`}
              pct={clientCheckIn?.done ? 100 : departurePct}
              complete={clientCheckIn?.done || departureComplete}
              details={[
                ...DEPARTURE_ITEMS.map(i => ({ label: i.label, value: `${clientCheckIn?.done ? i.max : (newCheckinQuantities[i.id] ?? 0)}/${i.max}` })),
                ...(clientCheckIn?.remarks ? [{ label: 'Remarques', value: clientCheckIn.remarks }] : []),
              ]}
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
