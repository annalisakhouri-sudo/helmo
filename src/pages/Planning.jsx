import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, AlertTriangle } from 'lucide-react'
import { addDays, format, startOfWeek, parseISO, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BOATS, BOOKINGS } from '@/lib/mock-data'
import BookingDetail from '@/components/planning/BookingDetail'

const DAYS = ['Sam', 'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

function getWeekDays(startDate) {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
}

function getBookingForBoat(boatId, days) {
  return BOOKINGS.filter(b => {
    if (b.boatId !== boatId) return false
    const start = parseISO(b.start)
    const end = parseISO(b.end)
    return days.some(d => isWithinInterval(d, { start, end }))
  })
}

function getSpanStyle(booking, days) {
  const start = parseISO(booking.start)
  const end = parseISO(booking.end)
  let startIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd'))
  let endIdx = days.findIndex(d => format(d, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd'))
  if (startIdx === -1) startIdx = 0
  if (endIdx === -1) endIdx = 6
  const width = ((endIdx - startIdx) / 7) * 100
  const left = (startIdx / 7) * 100
  return { left: `${left + 0.5}%`, width: `${width - 1}%` }
}

const COLORS = {
  teal:   { bg: 'bg-teal-50 hover:bg-teal-100', name: 'text-teal-800', meta: 'text-teal-600' },
  amber:  { bg: 'bg-amber-50 hover:bg-amber-100', name: 'text-amber-800', meta: 'text-amber-600' },
  danger: { bg: 'bg-danger-50 hover:bg-danger-100', name: 'text-danger-800', meta: 'text-danger-600' },
  blue:   { bg: 'bg-navy-50 hover:bg-navy-100', name: 'text-navy-800', meta: 'text-navy-600' },
}

export default function Planning() {
  const navigate = useNavigate()
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }
  const filteredBoats = BOATS.filter(b => b.brand === activeBrand)
  const filteredBookings = BOOKINGS.filter(b => b.brand === activeBrand)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date('2026-07-05')
    return d
  })
  const [selected, setSelected] = useState(null)

  const days = getWeekDays(weekStart)
  const skipperMissing = filteredBookings.filter(b => b.needsSkipper && !b.skipperId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Planning de la flotte</h1>
          <p className="text-xs text-gray-400">Haute saison · Sam → Sam</p>
        </div>
        <div className="flex gap-2 items-center">
          <button className="btn-ghost py-1.5 px-2" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium min-w-40 text-center">
            {format(days[0], 'd MMM', { locale: fr })} → {format(days[6], 'd MMM yyyy', { locale: fr })}
          </span>
          <button className="btn-ghost py-1.5 px-2" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight size={14} />
          </button>
          <button className="btn-primary ml-2"><Plus size={14} /> Ajouter</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Légende */}
        <div className="flex gap-4 mb-3 flex-wrap">
          {[
            { color: 'bg-teal-200', label: 'Avec skipper' },
            { color: 'bg-amber-100', label: 'Skipper manquant' },
            { color: 'bg-danger-100', label: 'Problème doc' },
            { color: 'bg-navy-50', label: 'Sans skipper' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className={`w-3 h-3 rounded ${color}`} />
              {label}
            </div>
          ))}
        </div>

        {/* Grille planning */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
          {/* Header jours */}
          <div className="grid bg-navy-900" style={{ gridTemplateColumns: '100px repeat(7, 1fr)' }}>
            <div className="border-r border-navy-800" />
            {days.map((day, i) => (
              <div key={i} className="py-2 px-1 text-center border-r border-navy-800 last:border-0">
                <div className="text-[9px] text-navy-100 uppercase tracking-wide">{DAYS[i]}</div>
                <div className={`text-sm font-medium ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-teal-200' : 'text-white'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Lignes bateaux */}
          {filteredBoats.map(boat => {
            const bookings = getBookingForBoat(boat.id, days)
            return (
              <div key={boat.id} className="grid border-t border-gray-100" style={{ gridTemplateColumns: '100px repeat(7, 1fr)', minHeight: 68 }}>
                {/* Label bateau */}
                <div className="bg-gray-50 border-r border-gray-100 px-3 py-2 flex flex-col justify-center">
                  <p className="text-xs font-medium text-gray-700 leading-tight">{boat.name}</p>
                  <p className="text-[10px] text-gray-400">{boat.type} {boat.length}m</p>
                </div>

                {/* Jours avec blocs */}
                <div className="col-span-7 relative">
                  {/* Cellules vides */}
                  <div className="grid h-full absolute inset-0" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {days.map((_, i) => (
                      <div key={i} className="border-r border-gray-100 last:border-0 bg-white" />
                    ))}
                  </div>

                  {/* Blocs de réservation */}
                  {bookings.map(b => {
                    const c = COLORS[b.color] || COLORS.blue
                    const span = getSpanStyle(b, days)
                    return (
                      <div
                        key={b.id}
                        className={`absolute top-1.5 bottom-1.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${c.bg}`}
                        style={span}
                        onClick={() => setSelected(b)}
                      >
                        <p className={`text-xs font-medium truncate ${c.name}`}>{b.client}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {b.skipperName && (
                            <span className="pill-skipper" style={{ fontSize: 9, padding: '1px 5px' }}>{b.skipperName.split(' ')[0]}</span>
                          )}
                          {b.draps?.length > 0 && (
                            <span className="pill-draps" style={{ fontSize: 9, padding: '1px 5px' }}>🛏 Draps</span>
                          )}
                          {b.status === 'skipper-missing' && (
                            <span className="pill-warn" style={{ fontSize: 9, padding: '1px 5px' }}>⚠ Skipper !</span>
                          )}
                          {b.status === 'doc-issue' && (
                            <span className="pill-danger" style={{ fontSize: 9, padding: '1px 5px' }}>⚠ Doc</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Alertes skipper manquant */}
        {skipperMissing.map(b => (
          <div key={b.id} className="alert-warn mb-2">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <span className="flex-1 text-sm text-amber-800">
              <strong>{b.boatName}</strong> — {b.client} : skipper requis non assigné
            </span>
            <button className="btn-primary py-1 px-3 text-xs" onClick={() => navigate('/skippers')}>
              Trouver →
            </button>
          </div>
        ))}
      </div>

      {/* Panneau de détail */}
      {selected && (
        <BookingDetail booking={selected} onClose={() => setSelected(null)} onFindSkipper={() => navigate('/skippers')} onViewDocs={() => navigate('/documents')} />
      )}
    </div>
  )
}
