import { useNavigate } from 'react-router-dom'
import { Moon, Sun, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function WeekendRotation({ saturday, returningBookings, onSelect }) {
  const navigate = useNavigate()

  const fridayLeavers = returningBookings.filter(b => !b.lastNightAboard)
  const saturdayLeavers = returningBookings.filter(b => b.lastNightAboard)
  const priorityCount = fridayLeavers.filter(b => b.relouedSoon).length

  if (returningBookings.length === 0) return null

  function handleClick(b) {
    if (onSelect) onSelect(b)
    else navigate('/planning')
  }

  return (
    <div className="card overflow-hidden p-0 mb-6">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
        <p className="text-sm font-semibold font-display">Rotation du week-end</p>
        <span className="text-xs text-gray-400">Sam. {format(saturday, 'd MMMM', { locale: fr })}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4">

        <div className="bg-gray-50 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <Moon size={14} className="text-gray-500" />
            <p className="text-xs font-semibold text-gray-600">Vendredi soir — libèrent ce soir</p>
          </div>
          {fridayLeavers.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucun départ vendredi soir</p>
          ) : (
            <div className="flex flex-col gap-2">
              {fridayLeavers.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-lg p-2.5 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
                  onClick={() => handleClick(b)}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-medium truncate">{b.boatName}</p>
                    {b.relouedSoon
                      ? <span className="pill-warn text-[10px] flex-shrink-0">Reloué demain</span>
                      : <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Pas reloué</span>
                    }
                  </div>
                  <p className="text-[11px] text-gray-400">{b.client} quitte ce soir{b.relouedSoon ? ' — prioritaire' : ' — pas urgent'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <Sun size={14} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-600">Samedi matin — dernière nuit à bord</p>
          </div>
          {saturdayLeavers.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Aucune dernière nuit à bord</p>
          ) : (
            <div className="flex flex-col gap-2">
              {saturdayLeavers.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-lg p-2.5 border border-navy-100 cursor-pointer hover:border-navy-200 transition-colors"
                  onClick={() => handleClick(b)}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-medium truncate">{b.boatName}</p>
                    <span className="pill-blue text-[10px] flex-shrink-0">10h → 14h</span>
                  </div>
                  <p className="text-[11px] text-gray-400">{b.client} part 10h{b.relouedSoon ? ' · prochain client 14h' : ''}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {priorityCount > 0 && (
        <div className="mx-4 mb-4 flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {priorityCount} bateau{priorityCount > 1 ? 'x' : ''} à traiter en priorité ce soir — reloué{priorityCount > 1 ? 's' : ''} dès demain
          </p>
        </div>
      )}
    </div>
  )
}
