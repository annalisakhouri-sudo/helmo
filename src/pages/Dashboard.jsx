import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { AlertTriangle, Plus, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { parseISO, addDays, format, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BOATS, BOOKINGS, DOC_LABELS, CLIENTS } from '@/lib/mock-data'
import WeekendRotation from '@/components/dashboard/WeekendRotation'
import BookingDetail from '@/components/planning/BookingDetail'
import MaintenanceModal from '@/components/planning/MaintenanceModal'

// Calcule le samedi de la semaine courante (ou égal si déjà samedi). Fiable, sans dépendance externe.
function getSaturdayOnOrBefore(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 1) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const TODAY = new Date('2026-07-04')

// ── Helpers pour qu'une location soit "complète" ou non ────────────
function isBookingComplete(b, boat) {
  const skipperOk = !b.needsSkipper || b.skipperId || b.skipperName
  const docsOk = !boat || Object.values(boat.docs).every(d => d.status === 'ok')
  return skipperOk && docsOk
}

function getBookingIssues(b, boat) {
  const issues = []
  if (b.needsSkipper && !b.skipperId && !b.skipperName) issues.push({ severity: 'warn', msg: 'Skipper requis non assigné', to: '/skippers' })
  if (boat) {
    Object.entries(boat.docs).forEach(([key, doc]) => {
      if (doc.status !== 'ok') issues.push({ severity: doc.status, msg: `${DOC_LABELS[key]} ${doc.status === 'danger' ? 'manquante' : doc.label.toLowerCase()}`, to: '/bateaux' })
    })
  }
  return issues
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function MovementRow({ booking, date, type, onSelect }) {
  const accent = type === 'depart' ? '#1B4F8A' : '#0F7D57'
  const bg = type === 'depart' ? '#EEF2F7' : '#E2F5EF'
  return (
    <div
      className="flex items-center gap-3 pl-2 pr-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border-l-2"
      style={{ borderColor: accent }}
      onClick={() => onSelect(booking)}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
        style={{ background: bg, color: accent }}
      >
        {initials(booking.client)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{booking.client}</p>
        <p className="text-[11px] text-gray-400 truncate">{booking.boatName}</p>
      </div>
      <p className="text-[11px] font-medium capitalize flex-shrink-0" style={{ color: accent }}>
        {format(parseISO(date), 'EEE d MMM', { locale: fr })}
      </p>
    </div>
  )
}

// ── Liste compacte des mouvements (départs/retours) d'une semaine, séparés ──
function WeekMovements({ title, subtitle, weekStart, weekEnd, bookings, onSelect, muted }) {
  const departs = bookings
    .filter(b => { try { return isWithinInterval(parseISO(b.start), { start: weekStart, end: weekEnd }) } catch { return false } })
    .sort((a, b) => a.start.localeCompare(b.start))
  const retours = bookings
    .filter(b => { try { return isWithinInterval(parseISO(b.end), { start: weekStart, end: weekEnd }) } catch { return false } })
    .sort((a, b) => a.end.localeCompare(b.end))

  return (
    <div className={`card p-0 overflow-hidden ${muted ? 'opacity-90' : ''}`}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <p className="text-sm font-semibold font-display">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      {departs.length === 0 && retours.length === 0 && (
        <div className="text-center py-6 text-xs text-gray-400">Aucun mouvement prévu</div>
      )}

      {departs.length > 0 && (
        <div className="px-3 pt-3">
          <div className="flex items-center gap-1.5 px-2 mb-1.5">
            <ArrowUpRight size={12} style={{ color: '#1B4F8A' }} />
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1B4F8A' }}>Départs</p>
            <span className="text-[10px] text-gray-300">· {departs.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {departs.map(b => <MovementRow key={`d-${b.id}`} booking={b} date={b.start} type="depart" onSelect={onSelect} />)}
          </div>
        </div>
      )}

      {retours.length > 0 && (
        <div className="px-3 pt-3 pb-3">
          <div className="flex items-center gap-1.5 px-2 mb-1.5">
            <ArrowDownLeft size={12} style={{ color: '#0F7D57' }} />
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#0F7D57' }}>Retours</p>
            <span className="text-[10px] text-gray-300">· {retours.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {retours.map(b => <MovementRow key={`r-${b.id}`} booking={b} date={b.end} type="retour" onSelect={onSelect} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { activeBrand, brand } = useOutletContext()
  const [listModal, setListModal] = useState(null) // 'departs' | 'retours' | null
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [gapInfo, setGapInfo] = useState(null) // { boat, booking, nextBooking } → fiche maintenance
  const [, forceDashboardUpdate] = useState(0) // force le recalcul des alertes après mutation d'un booking

  const boats = BOATS.filter(b => b.brand === activeBrand)
  const bookings = BOOKINGS.filter(b => b.brand === activeBrand)

  // Deux semaines de pilotage : celle en cours, et la suivante
  const currentWeekStart = getSaturdayOnOrBefore(TODAY)
  const currentWeekEnd = addDays(currentWeekStart, 7)
  const nextWeekStart = currentWeekEnd
  const nextWeekEnd = addDays(nextWeekStart, 7)

  const departs = bookings.filter(b => {
    try { return isWithinInterval(parseISO(b.start), { start: currentWeekStart, end: currentWeekEnd }) } catch { return false }
  })
  const retours = bookings.filter(b => {
    try { return isWithinInterval(parseISO(b.end), { start: currentWeekStart, end: currentWeekEnd }) } catch { return false }
  })

  // Toutes les locs actives cette semaine (départ OU en cours OU retour)
  const activeBookings = bookings.filter(b => {
    try { return parseISO(b.start) <= currentWeekEnd && parseISO(b.end) >= currentWeekStart } catch { return false }
  })

  const bookingsWithStatus = activeBookings.map(b => {
    const boat = boats.find(bt => bt.id === b.boatId)
    const issues = getBookingIssues(b, boat)
    return { ...b, boat, issues, complete: issues.length === 0 }
  })

  const incomplete = bookingsWithStatus.filter(b => !b.complete)

  // ── Rotation du week-end (samedi de la semaine en cours) ──
  const saturdayInPeriod = currentWeekStart
  const saturdayStr = format(saturdayInPeriod, 'yyyy-MM-dd')
  const endingThisSaturday = bookings.filter(b => b.end === saturdayStr)
  const returningBookings = endingThisSaturday.map(b => {
    const relouedSoon = bookings.some(other => other.boatId === b.boatId && other.start === saturdayStr)
    return { ...b, relouedSoon }
  })

  const weekRangeLabel = (start, end) => `${format(start, 'd MMM', { locale: fr })} → ${format(addDays(end, -1), 'd MMM yyyy', { locale: fr })}`

  // Clic sur une carte de rotation : si un technicien doit préparer le bateau pour le
  // prochain client (maintenance), on ouvre la fiche maintenance plutôt que la fiche loc.
  function handleRotationSelect(b) {
    if (b.relouedSoon) {
      const boat = boats.find(bt => bt.id === b.boatId)
      const nextBooking = bookings.find(o => o.boatId === b.boatId && o.start === b.end)
      setGapInfo({ boat, booking: b, nextBooking })
    } else {
      setSelectedBooking(b)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-lg font-bold">{brand?.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{brand?.port}</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/planning')}>
          <Plus size={14} /> Nouvelle location
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* Stats de la semaine en cours */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all duration-200" onClick={() => departs.length > 0 && setListModal('departs')}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2F7' }}>
              <ArrowUpRight size={18} style={{ color: '#1B4F8A' }} />
            </div>
            <div>
              <p className="font-display text-2xl font-bold" style={{ color: '#1B4F8A', lineHeight: 1.1 }}>{departs.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Départ{departs.length > 1 ? 's' : ''} cette semaine</p>
            </div>
          </div>
          <div className="card flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all duration-200" onClick={() => retours.length > 0 && setListModal('retours')}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E2F5EF' }}>
              <ArrowDownLeft size={18} style={{ color: '#0F7D57' }} />
            </div>
            <div>
              <p className="font-display text-2xl font-bold" style={{ color: '#0F7D57', lineHeight: 1.1 }}>{retours.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Retour{retours.length > 1 ? 's' : ''} cette semaine</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: incomplete.length > 0 ? '#FEF0F0' : '#E2F5EF' }}>
              <AlertTriangle size={18} style={{ color: incomplete.length > 0 ? '#B02020' : '#0F7D57' }} />
            </div>
            <div>
              <p className="font-display text-2xl font-bold" style={{ color: incomplete.length > 0 ? '#B02020' : '#0F7D57', lineHeight: 1.1 }}>{incomplete.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Location{incomplete.length > 1 ? 's' : ''} à régler</p>
            </div>
          </div>
        </div>

        {/* Rotation du week-end (vendredi soir / samedi matin) */}
        <WeekendRotation saturday={saturdayInPeriod} returningBookings={returningBookings} onSelect={handleRotationSelect} />

        {/* Alertes uniquement — ce qui bloque vraiment */}
        {incomplete.length > 0 && (
          <div className="mb-6">
            <p className="section-label">À régler cette semaine</p>
            <div className="flex flex-col gap-2">
              {incomplete.map(b => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-xl p-3 border bg-amber-50 border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setSelectedBooking(b)}
                >
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-amber-800">{b.boatName} — {b.client}</p>
                    <p className="text-xs text-amber-700">{b.issues.map(i => i.msg).join(' · ')}</p>
                  </div>
                  <span className="text-[10px] text-amber-600 font-medium whitespace-nowrap">Voir →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pilotage à 2 semaines : mouvements de la semaine en cours et de la suivante */}
        <div className="grid grid-cols-2 gap-4">
          <WeekMovements
            title="Cette semaine"
            subtitle={weekRangeLabel(currentWeekStart, currentWeekEnd)}
            weekStart={currentWeekStart}
            weekEnd={currentWeekEnd}
            bookings={bookings}
            onSelect={setSelectedBooking}
          />
          <WeekMovements
            title="Semaine prochaine"
            subtitle={weekRangeLabel(nextWeekStart, nextWeekEnd)}
            weekStart={nextWeekStart}
            weekEnd={nextWeekEnd}
            bookings={bookings}
            onSelect={setSelectedBooking}
            muted
          />
        </div>

      </div>

      {/* Modale liste départs ou retours */}
      {listModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6" onClick={() => setListModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-display text-white text-base font-bold">{listModal === 'departs' ? 'Départs' : 'Retours'}</h2>
                <p className="text-navy-100 text-xs capitalize">{weekRangeLabel(currentWeekStart, currentWeekEnd)}</p>
              </div>
              <button onClick={() => setListModal(null)} className="text-navy-100 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
              {(listModal === 'departs' ? departs : retours).map(b => (
                <div
                  key={b.id}
                  className="card-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => { setListModal(null); setSelectedBooking(b) }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.boatName}</p>
                      <p className="text-xs text-gray-400">{b.client} · {listModal === 'departs' ? `Départ ${b.start}` : `Retour ${b.end}`}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fiche loc complète au clic */}
      {selectedBooking && (
        <BookingDetail
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onFindSkipper={() => { setSelectedBooking(null); navigate('/skippers') }}
          onViewDocs={() => { setSelectedBooking(null); navigate('/bateaux') }}
          onViewClientDocs={() => { setSelectedBooking(null); navigate('/clients') }}
          onViewClient={() => { const c = CLIENTS.find(c => c.locations.includes(selectedBooking.id)); setSelectedBooking(null); navigate(c ? `/clients?client=${c.id}` : '/clients') }}
          onBookingChange={() => forceDashboardUpdate(v => v + 1)}
        />
      )}

      {/* Fiche maintenance — quand la rotation implique une préparation technicien */}
      {gapInfo && (
        <MaintenanceModal
          booking={gapInfo.booking}
          nextBooking={gapInfo.nextBooking}
          boat={gapInfo.boat}
          onClose={() => setGapInfo(null)}
        />
      )}
    </div>
  )
}
