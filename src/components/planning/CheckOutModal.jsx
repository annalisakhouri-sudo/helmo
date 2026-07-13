import { useState, useEffect } from 'react'
import { X, Check, ChevronDown, ChevronUp, AlertTriangle, Euro, Minus, Plus, CircleCheck } from 'lucide-react'
import { getMaintenanceTasks, setArrivalQuantity, updateAnomalyDetail, subscribe } from '@/lib/shared-state'
import { CHECKLIST, ALL_ITEMS } from './MaintenanceModal'

// Fiche CHECK-OUT côté app technicien : ici, tout le détail — comptage, écarts détectés
// automatiquement par rapport à la référence du check-in de départ, note libre et prix
// en cas de perte/casse. Le technicien peut aussi écarter un écart (fausse alerte).
function QuantityCounter({ item, qty, refQty, onChange }) {
  const missing = qty < refQty
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${missing ? 'bg-danger-50 border border-danger-100' : 'bg-white border border-gray-100'}`}>
      <div className="flex-1 min-w-0">
        <span className="text-sm" style={{ color: missing ? '#791F1F' : '#374151', fontWeight: missing ? 600 : 400 }}>{item.label}</span>
        <p className="text-[10px] text-gray-400">Référence : {refQty}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50" onClick={() => onChange(Math.max(0, qty - 1))}><Minus size={12} /></button>
        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
        <button className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50" onClick={() => onChange(Math.min(item.max, qty + 1))}><Plus size={12} /></button>
      </div>
    </div>
  )
}

function AnomalyCard({ item, gap, detail, bookingId }) {
  return (
    <div className="rounded-xl border border-danger-100 bg-white p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} className="text-danger-600 flex-shrink-0" />
        <p className="text-sm font-medium text-danger-800 flex-1">{gap} {item.label.toLowerCase()} manquant{gap > 1 ? 's' : ''}</p>
        <button
          className="text-[10px] text-gray-400 hover:text-gray-600 underline flex-shrink-0"
          onClick={() => updateAnomalyDetail(bookingId, item.id, { dismissed: true })}
        >
          Ignorer cet écart
        </button>
      </div>
      <input
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-navy-600"
        placeholder="Note (ex : cassé, perdu en mer...)"
        value={detail.note || ''}
        onChange={e => updateAnomalyDetail(bookingId, item.id, { note: e.target.value })}
      />
      <div className="flex items-center gap-2">
        <Euro size={13} className="text-gray-400 flex-shrink-0" />
        <input
          type="number"
          min="0"
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-24 focus:outline-none focus:border-navy-600"
          placeholder="Prix"
          value={detail.price || ''}
          onChange={e => updateAnomalyDetail(bookingId, item.id, { price: e.target.value })}
        />
        <span className="text-[10px] text-gray-400">à retenir sur la caution</span>
      </div>
    </div>
  )
}

export default function CheckOutModal({ booking, onClose }) {
  const [, forceUpdate] = useState(0)
  const [collapsed, setCollapsed] = useState({})
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const stored = getMaintenanceTasks(booking.id, ALL_ITEMS.map(i => ({ id: i.id, qty: i.max, max: i.max })), [])
  const quantities = {}
  stored.arrival.forEach(t => { quantities[t.id] = t.qty })
  const anomalyDetails = stored.anomalyDetails || {}

  const missingItems = ALL_ITEMS.filter(i => quantities[i.id] < i.max && !anomalyDetails[i.id]?.dismissed)
  const okCount = ALL_ITEMS.filter(i => quantities[i.id] === i.max || anomalyDetails[i.id]?.dismissed).length
  const pct = Math.round((okCount / ALL_ITEMS.length) * 100)
  const complete = missingItems.length === 0
  const totalCost = missingItems.reduce((sum, i) => sum + (Number(anomalyDetails[i.id]?.price) || 0), 0)

  function toggleCat(cat) { setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] })) }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Check-out — {booking.boatName}</h2>
            <p className="text-navy-100 text-xs">{booking.client} · {booking.end}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">{okCount}/{ALL_ITEMS.length} conformes</span>
            <span className={`text-xs font-medium ${complete ? 'text-teal-600' : 'text-amber-600'}`}>{pct}%</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${complete ? 'bg-teal-400' : 'bg-amber-300'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {missingItems.length > 0 && (
            <div className="mb-4">
              <p className="section-label">Écarts à préciser</p>
              <div className="flex flex-col gap-2">
                {missingItems.map(i => (
                  <AnomalyCard key={i.id} item={i} gap={i.max - quantities[i.id]} detail={anomalyDetails[i.id] || {}} bookingId={booking.id} />
                ))}
              </div>
              {totalCost > 0 && (
                <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Euro size={12} /> Total à retenir</span>
                  <span className="text-sm font-bold text-danger-700">{totalCost}€</span>
                </div>
              )}
            </div>
          )}

          <p className="section-label">Comptage</p>
          {CHECKLIST.map(cat => {
            const isC = collapsed[cat.category]
            const catOk = cat.items.every(i => quantities[i.id] === i.max)
            return (
              <div key={cat.category} className="mb-2.5">
                <div
                  className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer"
                  style={{ background: catOk ? '#E1F5EE' : '#F9FAFB', border: `1px solid ${catOk ? '#9FE1CB' : '#f3f4f6'}` }}
                  onClick={() => toggleCat(cat.category)}
                >
                  <span className="text-sm font-medium" style={{ color: catOk ? '#085041' : '#111827' }}>{cat.category}</span>
                  {isC ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                </div>
                {!isC && (
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    {cat.items.map(item => (
                      <QuantityCounter
                        key={item.id}
                        item={item}
                        qty={quantities[item.id]}
                        refQty={item.max}
                        onChange={val => setArrivalQuantity(booking.id, item.id, val)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          {complete ? (
            <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-100 rounded-xl p-3">
              <CircleCheck size={18} className="text-teal-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-teal-800">Check-out complet</p>
                <p className="text-xs text-teal-600">Visible en temps réel par l'agence</p>
              </div>
            </div>
          ) : (
            <button className="btn-primary w-full justify-center py-3" onClick={onClose}><Check size={16} /> Terminer plus tard</button>
          )}
        </div>
      </div>
    </div>
  )
}
