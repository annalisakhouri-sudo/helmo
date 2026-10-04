import { getRequest } from '@/lib/skipper-requests'
import { addBooking } from '@/lib/bookings'
import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Wrench, Check, Sparkles } from 'lucide-react'
import { addDays, addMonths, format, parseISO, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, getDay, endOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BOATS, BOOKINGS, TECHNICIANS, CLIENTS, SKIPPERS } from '@/lib/mock-data'
import BookingDetail from '@/components/planning/BookingDetail'
import NewBookingModal from '@/components/planning/NewBookingModal'
import MaintenanceModal from '@/components/planning/MaintenanceModal'
import { getMaintenanceTasks, subscribe, getState } from '@/lib/shared-state'

// Calcule le samedi de la semaine courante (ou égal si déjà samedi). Fiable, sans dépendance externe.
function getSaturdayOnOrBefore(date) {
  const d = new Date(date)
  const day = d.getDay() // 0=dimanche ... 6=samedi
  const diff = (day + 1) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function getBookingColor(b) {
  if (b.status === 'doc-issue') return { bg: 'bg-danger-50', border: 'border-danger-200', text: 'text-danger-800', dot: 'bg-danger-400' }
  if (b.status === 'skipper-missing') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-300' }
  return { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-400' }
}

function bookingsForDay(day, bookings) {
  return bookings.filter(b => {
    try {
      return isWithinInterval(day, { start: parseISO(b.start), end: parseISO(b.end) })
    } catch { return false }
  })
}

// VUE SEMAINE
// Règles de positionnement (en fraction de jour, 0 = début de journée, 1 = fin de journée) :
// - Une loc démarre toujours au début de sa case (le jour J), s'étend jusqu'à 1.0 (fin de case)
//   sauf le jour de fin où elle s'arrête net en fonction de la nuitée à bord.
// - Sans nuitée à bord : la loc occupe ENTIÈREMENT la case du vendredi (s'arrête à la fin de la case).
// - Avec nuitée à bord : la loc s'arrête au TOUT DÉBUT de la case samedi (n'entre pas dedans).
// - Si le bateau repart le samedi après-midi avec un nouveau client : bloc maintenance fixe 10h→15h
//   (samedi, soit 0.42 → 0.625 de la case), ou dès la veille au soir si le départ précédent était
//   un vendredi soir (alors le bloc maintenance s'étend de vendredi 0.75 jusqu'à samedi 0.625).
function WeekView({ days, boats, bookings, onSelect, onSelectGap, highlightId }) {
  const N = days.length // 8 (samedi → samedi inclus)
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])
  const dayIndex = (dateStr) => days.findIndex(d => format(d, 'yyyy-MM-dd') === dateStr)
  const firstDayStr = format(days[0], 'yyyy-MM-dd')
  const lastDayStr = format(days[days.length - 1], 'yyyy-MM-dd')

  function getSpanStyle(b) {
    // Sortie d'un jour : occupe exactement sa case, rien d'autre.
    if (b.start === b.end) {
      const di = dayIndex(b.start)
      return { left: `${((di + 0.04) / N) * 100}%`, width: `${(0.92 / N) * 100}%` }
    }
    let si = dayIndex(b.start)
    let startFraction = si === -1 ? (b.start < firstDayStr ? 0 : N) : si
    if (si === -1) si = startFraction

    // Si cette loc suit directement une autre sur le même bateau avec un AUTRE client (même jour de
    // bascule), elle ne doit démarrer qu'après le bloc maintenance (samedi 15h), collée à lui.
    // Si c'est le MÊME client qui enchaîne (reste à bord), pas de décalage : continuité pure.
    const previous = bookings.find(o => o.boatId === b.boatId && o.end === b.start)
    if (previous && previous.clientId !== b.clientId && si !== -1 && si < N) {
      startFraction = si + 0.625 // pile à la fin du bloc maintenance (15h), aucun espace
    }

    const endIdx = dayIndex(b.end)
    let endFraction
    const nextBooking = bookings.find(o => o.boatId === b.boatId && o.start === b.end)
    const sameClientContinues = nextBooking && nextBooking.clientId === b.clientId

    if (sameClientContinues) {
      endFraction = endIdx !== -1 ? N : (b.end > lastDayStr ? N : startFraction)
    } else if (endIdx !== -1) {
      const hasMaintenanceNext = !!nextBooking
      endFraction = b.lastNightAboard === false
        ? endIdx - 1 + 1
        : endIdx + (hasMaintenanceNext ? 0.42 : 0)
    } else if (b.end > lastDayStr) {
      endFraction = N
    } else {
      endFraction = startFraction
    }

    const ei = Math.max(startFraction + 0.3, endFraction)
    return { left: `${(startFraction / N) * 100}%`, width: `${((ei - startFraction) / N) * 100}%` }
  }

  // Un booking qui s'est déjà terminé avant ou pile au tout début de la vue actuelle
  // (et qui n'a pas de nuitée à bord, donc fini la veille au soir) appartient à la semaine
  // précédente : on ne l'affiche pas du tout dans cette vue pour éviter un résidu minuscule.
  function isVisibleInView(b) {
    if (b.start === b.end) return dayIndex(b.start) !== -1 // sortie d'un jour : visible si son jour est affiché
    const endIdx = dayIndex(b.end)
    if (endIdx === 0 && b.lastNightAboard === false) return false
    return days.some(d => { try { return isWithinInterval(d, { start: parseISO(b.start), end: parseISO(b.end) }) } catch { return false } })
  }

  // Bloc maintenance : uniquement si un autre booking démarre exactement là où celui-ci finit.
  // Collé pile aux deux locations adjacentes (mêmes bornes que getSpanStyle ci-dessus).
  function getMaintenanceBlocks(boatBookings) {
    const blocks = []
    boatBookings.forEach(b => {
      if (b.start === b.end) return // sortie d'un jour : retour le soir, pas de rotation du samedi
      const next = bookings.find(o => o.boatId === b.boatId && o.start === b.end)
      if (!next) return
      if (next.clientId === b.clientId) return // même client qui reste à bord : pas de maintenance, continuité
      const endIdx = dayIndex(b.end)
      if (endIdx === -1) return // la fin de cette loc n'est pas dans la semaine affichée

      // Le bloc maintenance se termine toujours samedi 15h (= jour de fin + 0.625),
      // pile là où démarre la prochaine location.
      const blockEnd = endIdx + 0.625
      // Il démarre soit vendredi 17h (= jour de fin - 1 + 1.0, collé à la fin du bloc précédent),
      // soit samedi 10h (= jour de fin + 0.42), pile là où s'arrête la location précédente.
      const blockStart = b.lastNightAboard === false ? endIdx - 1 + 1 : endIdx + 0.42

      blocks.push({ start: blockStart, end: blockEnd, booking: b, nextBooking: next })
    })
    return blocks
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid bg-navy-900" style={{ gridTemplateColumns: `100px repeat(${N},1fr)` }}>
        <div className="border-r border-navy-800 py-2" />
        {days.map((day, i) => (
          <div key={i} className="py-2 px-1 text-center border-r last:border-0" style={{ borderRightColor: i === N - 2 ? '#E04040' : '#1a3354', borderRightWidth: i === N - 2 ? 2 : 1 }}>
            <div className="text-[9px] text-navy-100 uppercase">{DAYS_SHORT[(getDay(day) + 6) % 7]}</div>
            <div className={`text-sm font-medium ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-teal-200' : 'text-white'}`}>{format(day, 'd')}</div>
          </div>
        ))}
      </div>
      {boats.map(boat => {
        const bks = bookings.filter(b => b.boatId === boat.id && isVisibleInView(b))
        const allBoatBookings = bookings.filter(b => b.boatId === boat.id)
        const maintenanceBlocks = getMaintenanceBlocks(allBoatBookings)
        return (
          <div key={boat.id} className="grid border-t border-gray-100" style={{ gridTemplateColumns: `100px repeat(${N},1fr)`, minHeight: 72 }}>
            <div className="bg-gray-50 border-r border-gray-100 px-3 py-2 flex flex-col justify-center">
              <p className="text-xs font-medium text-gray-700 leading-tight">{boat.name}</p>
              <p className="text-[10px] text-gray-400">{boat.type}</p>
            </div>
            <div style={{ gridColumn: `span ${N}` }} className="relative">
              <div className="grid h-full absolute inset-0" style={{ gridTemplateColumns: `repeat(${N},1fr)` }}>
                {days.map((_, i) => <div key={i} className="last:border-0 bg-white" style={{ borderRight: i === N - 2 ? '2px solid #E04040' : '1px solid #f3f4f6' }} />)}
              </div>

              {/* Blocs de location */}
              {bks.map(b => {
                const c = getBookingColor(b)
                const span = getSpanStyle(b)
                return (
                  <div key={b.id} className={`absolute top-2 bottom-2 rounded-lg px-2.5 py-1.5 cursor-pointer border ${c.bg} ${c.border} ${c.text} hover:opacity-85 transition-opacity overflow-hidden shadow-sm`} style={{ ...span, zIndex: highlightId === b.id ? 5 : 1, ...(highlightId === b.id ? { boxShadow: '0 0 0 3px #F59E0B, 0 0 18px 4px rgba(245,158,11,0.55)', transform: 'scale(1.03)' } : highlightId ? { opacity: 0.35 } : {}), transition: 'all 0.3s ease' }} onClick={() => onSelect(b)}>
                    <p className="text-xs font-semibold truncate">{b.client}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {b.start === b.end && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#fff', color: '#0F6E56', border: '1px solid #9FE1CB', fontWeight: 500, whiteSpace: 'nowrap' }}>Journée</span>}
                      {(b.skipperName || b.skipperId) && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#185FA5', color: '#E6F1FB', fontWeight: 500, whiteSpace: 'nowrap' }}>{(b.skipperName || 'Skipper').split(' ')[0]}</span>}
                      {b.status === 'skipper-missing' && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#FAEEDA', color: '#633806', fontWeight: 500, whiteSpace: 'nowrap' }}>⚠ Skipper</span>}
                      {b.status === 'doc-issue' && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#FCEBEB', color: '#791F1F', fontWeight: 500, whiteSpace: 'nowrap' }}>⚠ Doc</span>}
                      {b.options?.menage && (() => {
                        const done = !!getState().menageDone[`menage-${b.id}`]
                        return (
                          <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: done ? '#E1F5EE' : '#FFF4D6', color: done ? '#085041' : '#854F0B', fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <Sparkles size={9} /> {done ? 'Ménage ✓' : 'Ménage'}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}

              {/* Blocs maintenance — couleur neutre (gris-bleu, distincte des anomalies jaunes/rouges), avec icône clé, cliquable. Légèrement élargi pour chevaucher et masquer tout interstice visuel dû aux coins arrondis. Badge OK vert quand 100% complété. */}
              {maintenanceBlocks.map((m, i) => {
                const overlap = 0.02
                const left = `${((m.start - overlap) / N) * 100}%`
                const width = `${((m.end - m.start + overlap * 2) / N) * 100}%`
                const arrivalTasks = getMaintenanceTasks(m.booking.id)
                const arrivalOk = (arrivalTasks.arrival || []).length > 0 && arrivalTasks.arrival.every(t => t.qty === t.max)
                const departureTasks = m.nextBooking ? getMaintenanceTasks(m.nextBooking.id) : null
                const departureOk = !m.nextBooking || (departureTasks && departureTasks.arrival.length > 0 && departureTasks.arrival.every(t => t.qty === t.max))
                const isComplete = arrivalOk && departureOk
                return (
                  <div
                    key={`maint-${i}`}
                    className="absolute top-2 bottom-2 cursor-pointer flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                    style={{
                      left,
                      width,
                      minWidth: 16,
                      background: isComplete ? '#E1F5EE' : '#EEF1F5',
                      border: `1.5px dashed ${isComplete ? '#9FE1CB' : '#B7C0CC'}`,
                      borderRadius: 6,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      zIndex: 3,
                    }}
                    onClick={(e) => { e.stopPropagation(); onSelectGap && onSelectGap(boat, m.booking) }}
                    title="Maintenance technicien avant la prochaine location"
                  >
                    {isComplete
                      ? <Check size={12} className="text-teal-700 flex-shrink-0" strokeWidth={3} />
                      : <Wrench size={11} className="text-gray-500 flex-shrink-0" />
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// VUE MOIS
// Nom du bateau tel qu'on le reconnaît d'un coup d'œil : "Dufour 360 GL — Yume" -> "Yume".
// Sans nom propre ("Dufour 350", "Tempest 505"), on garde le modèle complet.
function boatLabel(name = '') {
  return name.includes(' — ') ? name.split(' — ').pop() : name.split(' · ')[0]
}

function MonthView({ date, boats, bookings, onSelect }) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const days = eachDayOfInterval({ start, end })
  const firstDow = (getDay(start) + 6) % 7
  const blanks = Array(firstDow).fill(null)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 bg-navy-900">
        {DAYS_SHORT.map(d => <div key={d} className="py-2 text-center text-[10px] text-navy-100 uppercase tracking-wide">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {blanks.map((_,i) => <div key={`b${i}`} className="min-h-20 bg-gray-50 border-r border-b border-gray-100" />)}
        {days.map(day => {
          const dayBks = bookingsForDay(day, bookings)
          const isToday = format(day,'yyyy-MM-dd') === format(new Date(),'yyyy-MM-dd')
          return (
            <div key={day.toString()} className="min-h-20 border-r border-b border-gray-100 bg-white p-1">
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-navy-600 text-white' : 'text-gray-500'}`}>
                {format(day,'d')}
              </div>
              <div className="flex flex-col gap-0.5">
                {dayBks.slice(0,3).map(b => {
                  const c = getBookingColor(b)
                  const isStart = format(day,'yyyy-MM-dd') === b.start
                  return (
                    <div key={b.id} title={`${b.boatName} — ${b.client}`} className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate ${c.bg} ${c.text} hover:opacity-80`} onClick={() => onSelect(b)}>
                      {b.start === b.end ? `☀ ${boatLabel(b.boatName)} · ${b.client.split(' ')[0]}` : isStart ? `▶ ${boatLabel(b.boatName)} · ${b.client.split(' ')[0]}` : `— ${boatLabel(b.boatName)}`}
                    </div>
                  )
                })}
                {dayBks.length > 3 && <div className="text-[10px] text-gray-400 px-1">+{dayBks.length-3}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// VUE ANNÉE
function YearView({ year, boats, bookings, onSelect }) {
  const months = Array.from({length:12},(_,i) => new Date(year,i,1))

  function getBoatMonthBks(boatId, month) {
    const start = startOfMonth(month), end = endOfMonth(month)
    return bookings.filter(b => {
      if (b.boatId !== boatId) return false
      try {
        const bs = parseISO(b.start), be = parseISO(b.end)
        return bs <= end && be >= start
      } catch { return false }
    })
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid bg-navy-900" style={{gridTemplateColumns:'100px repeat(12,1fr)'}}>
        <div className="border-r border-navy-800 py-2" />
        {months.map((m,i) => (
          <div key={i} className="py-2 text-center border-r border-navy-800 last:border-0">
            <div className="text-[10px] text-navy-100 uppercase">{MONTHS[i]}</div>
          </div>
        ))}
      </div>
      {boats.map(boat => (
        <div key={boat.id} className="grid border-t border-gray-100" style={{gridTemplateColumns:'100px repeat(12,1fr)',minHeight:52}}>
          <div className="bg-gray-50 border-r border-gray-100 px-3 py-2 flex flex-col justify-center">
            <p className="text-xs font-medium text-gray-700 leading-tight">{boat.name}</p>
            <p className="text-[10px] text-gray-400">{boat.type}</p>
          </div>
          {months.map((month,mi) => {
            const bks = getBoatMonthBks(boat.id, month)
            const hasDoc = bks.some(b => b.status==='doc-issue')
            const hasSkip = bks.some(b => b.status==='skipper-missing')
            const occupied = bks.length > 0
            return (
              <div key={mi} className={`border-r border-gray-100 last:border-0 p-1 flex flex-col gap-0.5 ${occupied?'bg-white':'bg-gray-50'}`}>
                {bks.slice(0,2).map(b => {
                  const c = getBookingColor(b)
                  return (
                    <div key={b.id} className={`text-[9px] px-1 py-0.5 rounded cursor-pointer truncate ${c.bg} ${c.text} border ${c.border}`} onClick={() => onSelect(b)}>
                      {b.client.split(' ')[0]}
                    </div>
                  )
                })}
                {bks.length > 2 && <div className="text-[9px] text-gray-400 px-1">+{bks.length-2}</div>}
              </div>
            )
          })}
        </div>
      ))}
      <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex items-center gap-4">
        {[{dot:'bg-teal-400',label:'Complet'},{dot:'bg-amber-300',label:'Skipper manquant'},{dot:'bg-danger-400',label:'Doc manquant'}].map(({dot,label}) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Planning() {
  const navigate = useNavigate()
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }
  const [view, setView] = useState('week')
  // weekStartsOn samedi. Garantit que la vue semaine est toujours calée Samedi → Vendredi.
  const [currentDate, setCurrentDate] = useState(getSaturdayOnOrBefore(new Date('2026-07-04')))
  const [selected, setSelected] = useState(null)
  const [, forcePlanningUpdate] = useState(0) // force le recalcul des alertes après mutation d'un booking
  const [showNew, setShowNew] = useState(false)
  const [extraBookings, setExtraBookings] = useState([])
  const [gapInfo, setGapInfo] = useState(null) // { boat, booking } — créneau technicien cliqué
  const [highlightId, setHighlightId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const filteredBoats = BOATS.filter(b => b.brand === activeBrand)
  const allBookings = [...BOOKINGS, ...extraBookings].filter(b => b.brand === activeBrand)

  // Vient de la barre de recherche globale : saute sur la bonne semaine et surligne la loc.
  useEffect(() => {
    const id = searchParams.get('highlight')
    if (!id) return
    const target = allBookings.find(b => b.id === id)
    if (target) {
      setView('week')
      setCurrentDate(getSaturdayOnOrBefore(parseISO(target.start)))
      setHighlightId(id)
      setTimeout(() => setHighlightId(null), 4000)
    }
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function navigate_date(dir) {
    if (view === 'week') setCurrentDate(d => addDays(d, dir * 7))
    else if (view === 'month') setCurrentDate(d => addMonths(d, dir))
    else setCurrentDate(d => new Date(d.getFullYear() + dir, 0, 1))
  }

  const weekDays = Array.from({length:8},(_,i) => addDays(currentDate, i))
  const skipperMissing = allBookings.filter(b => b.needsSkipper && !b.skipperId && !b.skipperName)

  function getLabel() {
    if (view === 'week') return `${format(weekDays[0],'d MMM',{locale:fr})} → ${format(weekDays[7],'d MMM yyyy',{locale:fr})}`
    if (view === 'month') return format(currentDate,'MMMM yyyy',{locale:fr})
    return `Année ${currentDate.getFullYear()}`
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Planning de la flotte</h1>
          <p className="text-xs text-gray-400 capitalize">{getLabel()}</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Toggle vue */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {[{id:'week',label:'Semaine'},{id:'month',label:'Mois'},{id:'year',label:'Année'}].map(v => (
              <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view===v.id ? 'bg-navy-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                {v.label}
              </button>
            ))}
          </div>
          <button className="btn-ghost py-1.5 px-2" onClick={() => navigate_date(-1)}><ChevronLeft size={14} /></button>
          <button className="btn-ghost py-1.5 px-2" onClick={() => navigate_date(1)}><ChevronRight size={14} /></button>
          <button className="btn-primary ml-1" onClick={() => setShowNew(true)}><Plus size={14} /> Ajouter</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Légende */}
        <div className="flex gap-4 mb-3 flex-wrap">
          {[{dot:'bg-teal-400',label:'Complet'},{dot:'bg-amber-300',label:'Skipper manquant'},{dot:'bg-danger-400',label:'Problème doc'}].map(({dot,label}) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />{label}
            </div>
          ))}
        </div>

        {view === 'week' && <WeekView days={weekDays} boats={filteredBoats} bookings={allBookings} highlightId={highlightId} onSelect={setSelected} onSelectGap={(boat, booking) => setGapInfo({ boat, booking })} />}
        {view === 'month' && <MonthView date={currentDate} boats={filteredBoats} bookings={allBookings} onSelect={setSelected} />}
        {view === 'year' && <YearView year={currentDate.getFullYear()} boats={filteredBoats} bookings={allBookings} onSelect={setSelected} />}

        {/* Alertes skipper */}
        {skipperMissing.length > 0 && (
          <div className="mt-3">
            {skipperMissing.map(b => (
              <div key={b.id} className="alert-warn mb-2">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-amber-800">
                  <strong>{b.boatName}</strong> — {b.client} : {getRequest(b.id)?.status === 'en_attente'
                    ? `demande envoyée à ${SKIPPERS.find(sk => sk.id === getRequest(b.id).skipperId)?.name}, en attente`
                    : 'skipper requis non assigné'}
                </span>
                <button className="btn-primary py-1 px-3 text-xs" onClick={() => setSelected(b)}>{getRequest(b.id)?.status === 'en_attente' ? 'Voir →' : 'Trouver →'}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <BookingDetail booking={selected} onClose={() => setSelected(null)} onFindSkipper={() => navigate('/skippers')} onViewDocs={() => navigate('/bateaux')} onViewClientDocs={() => navigate('/clients')} onViewClient={() => { const c = CLIENTS.find(c => c.locations.includes(selected.id)); navigate(c ? `/clients?client=${c.id}` : '/clients') }} onBookingChange={() => forcePlanningUpdate(v => v + 1)} />}
      {showNew && <NewBookingModal activeBrand={activeBrand} onClose={() => setShowNew(false)} onAdd={b => { addBooking(b); forcePlanningUpdate(v => v + 1) }} />}

      {gapInfo && (() => {
        const nextBooking = allBookings.find(o => o.boatId === gapInfo.boat.id && o.start === gapInfo.booking.end)
        return (
          <MaintenanceModal
            booking={gapInfo.booking}
            nextBooking={nextBooking}
            boat={gapInfo.boat}
            onClose={() => setGapInfo(null)}
          />
        )
      })()}
    </div>
  )
}
