import { useState } from 'react'
import { X, Star, Send, ChevronLeft, Check } from 'lucide-react'
import { SKIPPERS, BOATS } from '@/lib/mock-data'
import { isSkipperFree, buildRequestMessage, sendSkipperRequest } from '@/lib/skipper-requests'

const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Choisir un skipper pour UNE location : on ne propose que ceux qui sont libres sur ces dates
// et qui naviguent ce type de bateau, puis la demande part (messagerie + espace skipper).
export default function SkipperPickerModal({ booking, onClose, onSent }) {
  const [chosen, setChosen] = useState(null)
  const [message, setMessage] = useState('')
  const boat = BOATS.find(b => b.id === booking.boatId)
  const days = Math.max(1, Math.round((new Date(booking.end) - new Date(booking.start)) / 86400000))

  const candidates = SKIPPERS
    .filter(s => !boat || s.boats.some(t => boat.type.includes(t)))
    .map(s => ({ ...s, free: isSkipperFree(s.id, booking) }))
    .sort((a, b) => Number(b.free) - Number(a.free) || b.rating - a.rating)

  function choose(s) {
    setChosen(s)
    setMessage(buildRequestMessage(s, booking))
  }

  function send() {
    sendSkipperRequest(booking, chosen.id, message)
    onSent && onSent()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{chosen ? `Demande à ${chosen.name}` : 'Trouver un skipper'}</h2>
            <p className="text-navy-100 text-xs">{booking.boatName} · {fmt(booking.start)} → {fmt(booking.end)} · {booking.client}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        {!chosen ? (
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
            {candidates.map(s => (
              <button
                key={s.id}
                disabled={!s.free}
                onClick={() => choose(s)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${s.free ? 'border-gray-100 hover:border-navy-200 hover:bg-navy-50' : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${s.color}`}>{s.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Star size={10} className="text-amber-400 fill-amber-400" /> {s.rating} · {s.missions} missions · {s.location}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-navy-900">{s.rate}€/j</p>
                  <p className={`text-[10px] font-medium ${s.free ? 'text-teal-600' : 'text-danger-600'}`}>{s.free ? `Libre · ${s.rate * days}€ au total` : 'Déjà pris sur ces dates'}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5">
            <p className="text-xs text-gray-400 mb-2">Message généré automatiquement, modifiable avant envoi. Il arrive dans l'espace et la messagerie du skipper.</p>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed"
              rows={10}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="bg-navy-50 border border-navy-100 rounded-xl p-3 mt-3 flex items-center gap-2">
              <Check size={13} className="text-navy-600 flex-shrink-0" />
              <p className="text-xs text-navy-700">Dès que {chosen.name.split(' ')[0]} accepte, il est affecté automatiquement à la location.</p>
            </div>
          </div>
        )}

        {chosen && (
          <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
            <button className="btn-ghost" onClick={() => setChosen(null)}><ChevronLeft size={14} /> Autre skipper</button>
            <button className="btn-primary flex-1 justify-center" onClick={send}><Send size={14} /> Envoyer la demande</button>
          </div>
        )}
      </div>
    </div>
  )
}
