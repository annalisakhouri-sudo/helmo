import { useState } from 'react'
import { X, Check, Send, CalendarPlus } from 'lucide-react'
import { BOATS } from '@/lib/mock-data'
import { getBookingsNeedingSkipper, isSkipperFree, buildRequestMessage, sendSkipperRequest } from '@/lib/skipper-requests'

const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Réserver un skipper depuis sa fiche : on choisit la LOCATION concernée (celles qui attendent
// un skipper), la demande part et le skipper est affecté dès qu'il accepte.
export default function ReservationModal({ skipper, onClose }) {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const options = getBookingsNeedingSkipper()
    .filter(b => { const boat = BOATS.find(x => x.id === b.boatId); return !boat || skipper.boats.some(t => boat.type.includes(t)) })
    .map(b => ({ ...b, free: isSkipperFree(skipper.id, b) }))
  const booking = options.find(b => b.id === bookingId)

  function next() {
    if (!booking) { setError('Choisis la location concernée'); return }
    if (!booking.free) { setError(`${skipper.name.split(' ')[0]} est déjà pris sur ces dates`); return }
    setMessage(buildRequestMessage(skipper, booking))
    setStep(2)
  }

  function send() {
    sendSkipperRequest(booking, skipper.id, message)
    setDone(true)
  }

  if (done) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-teal-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Demande envoyée !</h2>
        <p className="text-sm text-gray-400 mb-6">{skipper.name} l'a reçue dans son espace et sa messagerie. Dès qu'il accepte, il est affecté à la location {booking.boatName}.</p>
        <button className="btn-primary w-full justify-center" onClick={onClose}>Fermer</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${skipper.color}`}>{skipper.initials}</div>
            <div>
              <h2 className="font-display text-white text-base font-bold">Réserver {skipper.name.split(' ')[0]}</h2>
              <p className="text-navy-100 text-xs">{skipper.rate}€/j · {skipper.location}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {['Location concernée', 'Message & envoi'].map((s, i) => (
            <div key={i} className={`flex-1 py-2.5 text-center text-xs transition-colors ${step === i + 1 ? 'bg-white text-navy-600 font-medium border-b-2 border-navy-600' : step > i + 1 ? 'text-teal-600' : 'text-gray-400'}`}>
              {step > i + 1 && '✓ '}{s}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === 1 && (
            options.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Aucune location n'attend de skipper.</p>
                <p className="text-xs text-gray-400">Quand une location avec l'option skipper n'en a pas encore, elle apparaît ici.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-400 mb-1">Locations qui attendent un skipper :</p>
                {options.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setBookingId(b.id); setError('') }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${bookingId === b.id ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:bg-gray-50'} ${!b.free ? 'opacity-60' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.boatName}</p>
                      <p className="text-xs text-gray-400">{fmt(b.start)} → {fmt(b.end)} · {b.client} · {b.guests}</p>
                    </div>
                    <span className={`text-[10px] font-medium flex-shrink-0 ${b.free ? 'text-teal-600' : 'text-danger-600'}`}>{b.free ? 'Libre' : 'Déjà pris'}</span>
                  </button>
                ))}
                {error && <p className="text-xs text-danger-600 mt-1">{error}</p>}
              </div>
            )
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Message à {skipper.name.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 mb-3">Généré automatiquement — modifiable avant envoi.</p>
              <textarea
                className="w-full text-sm border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed"
                rows={10}
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {step > 1 && <button className="btn-ghost" onClick={() => setStep(1)}>← Retour</button>}
          {step === 1 && options.length > 0 && <button className="btn-primary flex-1 justify-center" onClick={next}><CalendarPlus size={14} /> Continuer →</button>}
          {step === 2 && <button className="btn-primary flex-1 justify-center" onClick={send}><Send size={14} /> Envoyer la demande</button>}
        </div>
      </div>
    </div>
  )
}
