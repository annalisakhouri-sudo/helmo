import { useState } from 'react'
import { X, Check, Send, CalendarPlus } from 'lucide-react'
import { BOATS } from '@/lib/mock-data'

function generateMessage(skipper, form, boat) {
  if (!form.dateStart || !form.dateEnd || !boat) return ''
  const start = new Date(form.dateStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const end = new Date(form.dateEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const days = Math.ceil((new Date(form.dateEnd) - new Date(form.dateStart)) / (1000 * 60 * 60 * 24))
  return `Bonjour ${skipper.name.split(' ')[0]},\n\nNous souhaiterions vous réserver pour une mission sur le ${boat.name} du ${start} au ${end} (${days} jour${days > 1 ? 's' : ''}), pour ${form.guests} au départ du ${boat.port}.\n\nTarif convenu : ${skipper.rate}€/j${form.notes ? `\n\nNotes : ${form.notes}` : ''}\n\nPouvez-vous confirmer votre disponibilité ?\n\nCordialement,\nMidi Nautisme`
}

export default function ReservationModal({ skipper, onClose, onSend }) {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ boatId: '', dateStart: '', dateEnd: '', guests: '4 personnes', notes: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  const availableBoats = BOATS.filter(b => skipper.boats.some(bt => b.type.includes(bt)))

  function set(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
    const boat = BOATS.find(b => b.id === next.boatId)
    if (next.dateStart && next.dateEnd && boat) setMessage(generateMessage(skipper, next, boat))
  }

  function validate() {
    const e = {}
    if (!form.boatId) e.boatId = 'Sélectionne un bateau'
    if (!form.dateStart) e.dateStart = 'Date requise'
    if (!form.dateEnd) e.dateEnd = 'Date requise'
    else if (form.dateEnd <= form.dateStart) e.dateEnd = 'Doit être après le début'
    setErrors(e)
    if (!Object.keys(e).length) {
      const boat = BOATS.find(b => b.id === form.boatId)
      setMessage(generateMessage(skipper, form, boat))
      setStep(2)
    }
  }

  const inp = (k) => `w-full text-sm px-3 py-2 border rounded-lg bg-white transition-colors ${errors[k] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'}`

  if (done) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-teal-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Demande envoyée !</h2>
        <p className="text-sm text-gray-400 mb-6">{skipper.name} a reçu votre demande. La mission apparaîtra dans le planning dès confirmation.</p>
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
          {['Détails mission', 'Message & envoi'].map((s, i) => (
            <div key={i} className={`flex-1 py-2.5 text-center text-xs transition-colors ${step === i+1 ? 'bg-white text-navy-600 font-medium border-b-2 border-navy-600' : step > i+1 ? 'text-teal-600' : 'text-gray-400'}`}>
              {step > i+1 && '✓ '}{s}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {step === 1 && (
            <div>
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Bateau <span className="text-danger-600">*</span></p>
                <select className={inp('boatId')} value={form.boatId} onChange={e => set('boatId', e.target.value)}>
                  <option value="">-- Sélectionner un bateau --</option>
                  {availableBoats.map(b => <option key={b.id} value={b.id}>{b.name} — {b.type} {b.length}m</option>)}
                </select>
                {errors.boatId && <p className="text-xs text-danger-600 mt-1">{errors.boatId}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Date début <span className="text-danger-600">*</span></p>
                  <input type="date" className={inp('dateStart')} value={form.dateStart} onChange={e => set('dateStart', e.target.value)} />
                  {errors.dateStart && <p className="text-xs text-danger-600 mt-1">{errors.dateStart}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Date fin <span className="text-danger-600">*</span></p>
                  <input type="date" className={inp('dateEnd')} value={form.dateEnd} onChange={e => set('dateEnd', e.target.value)} />
                  {errors.dateEnd && <p className="text-xs text-danger-600 mt-1">{errors.dateEnd}</p>}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Personnes à bord</p>
                <select className={inp('guests')} value={form.guests} onChange={e => set('guests', e.target.value)}>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n} personne{n>1?'s':''}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Notes complémentaires</p>
                <textarea className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600" rows={2} placeholder="Ex: client VIP, navigation de nuit prévue..." value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
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
              <div className="bg-navy-50 border border-navy-100 rounded-xl p-3 mt-3">
                <p className="text-xs text-navy-700">
                  <strong>Récap :</strong> {BOATS.find(b => b.id === form.boatId)?.name} · {form.dateStart} → {form.dateEnd} · {form.guests} · {skipper.rate}€/j
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {step > 1 && <button className="btn-ghost" onClick={() => setStep(1)}>← Retour</button>}
          {step === 1 && <button className="btn-primary flex-1 justify-center" onClick={validate}><CalendarPlus size={14} /> Continuer →</button>}
          {step === 2 && <button className="btn-primary flex-1 justify-center" onClick={() => setDone(true)}><Send size={14} /> Envoyer la demande</button>}
        </div>
      </div>
    </div>
  )
}
