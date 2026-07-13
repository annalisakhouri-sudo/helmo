import { useState } from 'react'
import { ChevronLeft, ChevronRight, Moon } from 'lucide-react'
import { PRICING_PERIODS } from '@/lib/mock-data'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS_SHORT = ['L','M','M','J','V','S','D']

function findPeriod(dateStr) {
  return PRICING_PERIODS.find(p => dateStr >= p.start && dateStr <= p.end) || null
}

function fmt(date) {
  return date.toISOString().split('T')[0]
}

// Sélecteur de dates visuel, gros calendrier.
// brand: 'midi-nautisme' | 'locamotors' — Locamotors reste toujours libre, à la journée.
// Si la période couvrant le jour cliqué est en rythme 'weekly-sat', seuls samedis et vendredis
// sont sélectionnables, et la sélection saute automatiquement à 7 jours (ou multiples).
export default function DateRangePicker({ brand, dateStart, dateEnd, lastNightAboard, onChange }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const base = dateStart ? new Date(dateStart) : new Date('2026-07-01')
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [picking, setPicking] = useState(dateStart && !dateEnd ? 'end' : 'start')

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const firstDow = (new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay() + 6) % 7

  function isLocked(dateStr) {
    if (brand === 'locamotors') return false
    const period = findPeriod(dateStr)
    return period?.rhythm === 'weekly-sat'
  }

  function isSelectable(dateStr) {
    if (!isLocked(dateStr)) return true
    const day = new Date(dateStr).getDay()
    return day === 6 || day === 5 // samedi ou vendredi
  }

  function handleClick(dateStr) {
    if (!isSelectable(dateStr)) return

    if (picking === 'start' || !dateStart) {
      onChange({ dateStart: dateStr, dateEnd: '' })
      setPicking('end')
      return
    }

    // Reclic sur le jour de départ = location d'un seul jour (jour J seulement)
    if (dateStr === dateStart) {
      onChange({ dateStart, dateEnd: dateStr })
      setPicking('start')
      return
    }

    // Date antérieure au départ choisi : on recommence la sélection à partir de là
    if (dateStr < dateStart) {
      onChange({ dateStart: dateStr, dateEnd: '' })
      return
    }

    if (isLocked(dateStart)) {
      // Verrouillé sam→ven : on cale automatiquement sur un multiple de 7 jours
      const diffDays = Math.round((new Date(dateStr) - new Date(dateStart)) / 86400000)
      const weeks = Math.max(1, Math.round(diffDays / 7))
      const end = new Date(dateStart)
      end.setDate(end.getDate() + weeks * 7 - (lastNightAboard ? 0 : 1))
      onChange({ dateStart, dateEnd: fmt(end) })
    } else {
      onChange({ dateStart, dateEnd: dateStr })
    }
    setPicking('start')
  }

  function navigate(dir) {
    setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1))
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)
    return { date: d, str: fmt(d) }
  })

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-navy-900 px-4 py-3">
        <button type="button" className="text-white/70 hover:text-white p-1" onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
        <p className="text-sm font-semibold text-white">{MONTHS_FR[viewMonth.getMonth()]} {viewMonth.getFullYear()}</p>
        <button type="button" className="text-white/70 hover:text-white p-1" onClick={() => navigate(1)}><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-7 bg-gray-50">
        {DAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center py-2 text-[10px] font-medium text-gray-400 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`} className="aspect-square border-r border-b border-gray-50 bg-gray-50/50" />)}
        {days.map(({ date, str }) => {
          const locked = isLocked(str)
          const selectable = isSelectable(str)
          const isStart = str === dateStart
          const isEnd = str === dateEnd
          const inRange = dateStart && dateEnd && str > dateStart && str < dateEnd
          const period = findPeriod(str)

          return (
            <button
              key={str}
              type="button"
              disabled={!selectable}
              onClick={() => handleClick(str)}
              className="relative aspect-square border-r border-b border-gray-50 flex flex-col items-center justify-center transition-colors"
              style={{
                background: isStart || isEnd ? '#1B4F8A' : inRange ? '#EEF2F7' : !selectable ? '#FAFAFA' : '#fff',
                cursor: selectable ? 'pointer' : 'not-allowed',
              }}
            >
              <span
                className="text-sm"
                style={{
                  color: isStart || isEnd ? '#fff' : !selectable ? '#d1d5db' : '#374151',
                  fontWeight: isStart || isEnd ? 600 : 400,
                }}
              >
                {date.getDate()}
              </span>
              {period && selectable && !isStart && !isEnd && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full" style={{ background: period.color }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {PRICING_PERIODS.filter(p => p.start.slice(0, 7) <= fmt(viewMonth).slice(0, 7) && p.end.slice(0, 7) >= fmt(viewMonth).slice(0, 7)).map(p => (
            <div key={p.id} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
              <span className="text-[10px] text-gray-400">{p.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">{picking === 'start' ? 'Choisir le départ' : 'Choisir le retour'}</p>
      </div>
    </div>
  )
}
