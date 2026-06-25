import { useState } from 'react'
import { X, AlertTriangle, Check, CircleCheck } from 'lucide-react'
import { BOATS, SKIPPERS } from '@/lib/mock-data'

const STEPS = [
  { id: 1, label: 'Bateau & dates', icon: '⛵' },
  { id: 2, label: 'Client', icon: '👤' },
  { id: 3, label: 'Options', icon: '⚙️' },
  { id: 4, label: 'Récap', icon: '✓' },
]

const OPTIONS = [
  { id: 'skipper', label: 'Skipper', icon: 'ti-anchor', hasSub: true },
  { id: 'draps', label: 'Draps & linge', icon: 'ti-shirt', hasSub: true },
  { id: 'carbu', label: 'Carburant inclus', icon: 'ti-gas-station', hasSub: false },
  { id: 'sup', label: 'SUP', icon: 'ti-ripple', hasSub: true },
  { id: 'annexe', label: 'Annexe / zodiac', icon: 'ti-sailboat', hasSub: false },
  { id: 'taud', label: 'Taud de soleil', icon: 'ti-sun', hasSub: false },
  { id: 'masque', label: 'Masque & tuba', icon: 'ti-scuba-mask', hasSub: true },
  { id: 'franchise', label: 'Franchise', icon: 'ti-shield-check', hasSub: true },
]

function Field({ label, required, error, children }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">
        {label}{required && <span className="text-danger-600 ml-0.5">*</span>}
      </p>
      {children}
      {error && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <AlertTriangle size={11} className="text-danger-600 flex-shrink-0" />
          <p className="text-xs text-danger-600">{error}</p>
        </div>
      )}
    </div>
  )
}

export default function NewBookingModal({ onClose, onAdd, activeBrand }) {
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(false)

  const boats = BOATS.filter(b => b.brand === activeBrand)

  const [form, setForm] = useState({
    boatId: '', dateStart: '', dateEnd: '', guests: '',
    nom: '', prenom: '', tel: '', email: '',
    options: {},
    skipperName: '', cabines: '3', supQty: '2', masqueQty: '3', franchise: '1500',
  })

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  function toggleOpt(id) {
    setForm(f => ({ ...f, options: { ...f.options, [id]: !f.options[id] } }))
    if (id === 'franchise' && errors.franchise) setErrors(e => ({ ...e, franchise: '' }))
  }

  function validate1() {
    const e = {}
    if (!form.boatId) e.boatId = 'Sélectionne un bateau.'
    if (!form.dateStart) e.dateStart = 'Date de début requise.'
    if (!form.dateEnd) e.dateEnd = 'Date de fin requise.'
    else if (form.dateEnd <= form.dateStart) e.dateEnd = 'La date de fin doit être après le début.'
    if (!form.guests) e.guests = 'Indique le nombre de personnes à bord.'
    setErrors(e)
    setGlobalError(Object.keys(e).length > 0)
    if (!Object.keys(e).length) { setStep(2); setGlobalError(false) }
  }

  function validate2() {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    if (!form.prenom.trim()) e.prenom = 'Le prénom est requis.'
    if (!form.tel.trim()) e.tel = 'Le téléphone est requis.'
    setErrors(e)
    setGlobalError(Object.keys(e).length > 0)
    if (!Object.keys(e).length) { setStep(3); setGlobalError(false) }
  }

  function validate3() {
    const e = {}
    if (form.options.franchise && !form.franchise) e.franchise = 'Indique le montant de la franchise.'
    setErrors(e)
    if (!Object.keys(e).length) setStep(4)
  }

  function confirm() {
    const boat = BOATS.find(b => b.id === form.boatId)
    onAdd && onAdd({
      id: 'bk-new-' + Date.now(),
      boatId: form.boatId,
      boatName: boat?.name || '',
      brand: activeBrand,
      client: form.prenom + ' ' + form.nom,
      phone: form.tel,
      guests: form.guests,
      start: form.dateStart,
      end: form.dateEnd,
      skipperName: form.options.skipper ? form.skipperName : null,
      needsSkipper: !!form.options.skipper,
      draps: form.options.draps ? [{ name: `${form.cabines} cabine(s)`, qty: parseInt(form.cabines), unit: 'jeux' }] : [],
      status: form.options.skipper ? 'confirmed' : 'confirmed',
      color: 'teal',
      options: form.options,
    })
    setDone(true)
  }

  const inputClass = (field) =>
    `w-full text-sm px-3 py-2 border rounded-lg bg-white text-gray-800 transition-colors ${
      errors[field] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'
    }`

  const boat = BOATS.find(b => b.id === form.boatId)
  const selectedOpts = OPTIONS.filter(o => form.options[o.id])

  if (done) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <CircleCheck size={36} className="text-teal-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Location créée !</h2>
        <p className="text-sm text-gray-400 mb-6">Elle apparaît maintenant dans le planning.</p>
        <div className="flex gap-3">
          <button className="btn-primary flex-1 justify-center" onClick={onClose}>Voir le planning</button>
          <button className="btn-ghost flex-1 justify-center" onClick={() => { setDone(false); setStep(1); setForm({ boatId:'',dateStart:'',dateEnd:'',guests:'',nom:'',prenom:'',tel:'',email:'',options:{},skipperName:'',cabines:'3',supQty:'2',masqueQty:'3',franchise:'1500' }) }}>
            + Nouvelle loc
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Nouvelle location</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className="flex bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs transition-colors ${
              step === s.id ? 'bg-white text-navy-600 font-medium border-b-2 border-navy-600' :
              step > s.id ? 'text-teal-600' : 'text-gray-400'
            }`}>
              {step > s.id ? <Check size={12} /> : null}
              {s.label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">

          {/* Erreur globale */}
          {globalError && (
            <div className="flex items-center gap-2 bg-danger-50 border border-danger-100 rounded-lg p-3 mb-4 text-sm text-danger-800">
              <AlertTriangle size={14} className="flex-shrink-0" />
              Merci de remplir tous les champs obligatoires avant de continuer.
            </div>
          )}

          {/* ÉTAPE 1 */}
          {step === 1 && (
            <div>
              <Field label="Marque" required>
                <select className={inputClass('brand')} value={activeBrand} disabled>
                  <option value="midi-nautisme">Midi Nautisme</option>
                  <option value="locamotors">Locamotors</option>
                </select>
              </Field>
              <Field label="Bateau" required error={errors.boatId}>
                <select className={inputClass('boatId')} value={form.boatId} onChange={e => set('boatId', e.target.value)}>
                  <option value="">-- Sélectionner un bateau --</option>
                  {boats.map(b => <option key={b.id} value={b.id}>{b.name} — {b.type} {b.length}m</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de début" required error={errors.dateStart}>
                  <input type="date" className={inputClass('dateStart')} value={form.dateStart} onChange={e => set('dateStart', e.target.value)} />
                </Field>
                <Field label="Date de fin" required error={errors.dateEnd}>
                  <input type="date" className={inputClass('dateEnd')} value={form.dateEnd} onChange={e => set('dateEnd', e.target.value)} />
                </Field>
              </div>
              <Field label="Personnes à bord" required error={errors.guests}>
                <select className={inputClass('guests')} value={form.guests} onChange={e => set('guests', e.target.value)}>
                  <option value="">-- Nombre de personnes --</option>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n} personne{n > 1 ? 's' : ''}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* ÉTAPE 2 */}
          {step === 2 && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nom" required error={errors.nom}>
                  <input type="text" className={inputClass('nom')} placeholder="Dupont" value={form.nom} onChange={e => set('nom', e.target.value)} />
                </Field>
                <Field label="Prénom" required error={errors.prenom}>
                  <input type="text" className={inputClass('prenom')} placeholder="Jean" value={form.prenom} onChange={e => set('prenom', e.target.value)} />
                </Field>
              </div>
              <Field label="Téléphone" required error={errors.tel}>
                <input type="tel" className={inputClass('tel')} placeholder="06 12 34 56 78" value={form.tel} onChange={e => set('tel', e.target.value)} />
              </Field>
              <Field label="Email (optionnel)">
                <input type="email" className={inputClass('email')} placeholder="jean.dupont@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
            </div>
          )}

          {/* ÉTAPE 3 */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map(opt => (
                <div key={opt.id}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${form.options[opt.id] ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:border-gray-200'}`}
                  onClick={() => toggleOpt(opt.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className={`ti ${opt.icon} text-navy-600`} style={{ fontSize: 16 }} aria-hidden="true" />
                      <span className={`text-sm font-medium ${form.options[opt.id] ? 'text-navy-800' : ''}`}>{opt.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${form.options[opt.id] ? 'bg-navy-600 border-navy-600' : 'border border-gray-300'}`}>
                      {form.options[opt.id] && <Check size={10} className="text-white" />}
                    </div>
                  </div>

                  {form.options[opt.id] && opt.hasSub && (
                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                      {opt.id === 'skipper' && (
                        <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.skipperName} onChange={e => set('skipperName', e.target.value)}>
                          {SKIPPERS.map(s => <option key={s.id}>{s.name} — {s.rate}€/j</option>)}
                          <option>Skipper externe (hors app)</option>
                        </select>
                      )}
                      {opt.id === 'draps' && (
                        <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.cabines} onChange={e => set('cabines', e.target.value)}>
                          {[1,2,3,4].map(n => <option key={n} value={n}>{n} cabine{n>1?'s':''}</option>)}
                        </select>
                      )}
                      {opt.id === 'sup' && (
                        <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.supQty} onChange={e => set('supQty', e.target.value)}>
                          <option value="1">1 SUP</option><option value="2">2 SUP</option>
                        </select>
                      )}
                      {opt.id === 'masque' && (
                        <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.masqueQty} onChange={e => set('masqueQty', e.target.value)}>
                          {[1,2,3,4].map(n => <option key={n} value={n}>{n} jeu{n>1?'x':''}</option>)}
                        </select>
                      )}
                      {opt.id === 'franchise' && (
                        <div>
                          <div className="flex items-center gap-2">
                            <input type="number" className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.franchise} onChange={e => set('franchise', e.target.value)} />
                            <span className="text-xs text-gray-400">€ de franchise</span>
                          </div>
                          {errors.franchise && <p className="text-xs text-danger-600 mt-1">{errors.franchise}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ÉTAPE 4 — RÉCAP */}
          {step === 4 && (
            <div>
              <div className="card mb-4 py-2 px-4">
                {[
                  ['Bateau', boat?.name || '—'],
                  ['Dates', `${form.dateStart} → ${form.dateEnd}`],
                  ['Personnes', form.guests],
                  ['Client', `${form.prenom} ${form.nom}`],
                  ['Téléphone', form.tel],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Options</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedOpts.length > 0
                  ? selectedOpts.map(o => <span key={o.id} className="pill-ok">{o.label}</span>)
                  : <span className="text-xs text-gray-400">Aucune option sélectionnée</span>
                }
              </div>
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-800">
                <Check size={14} className="flex-shrink-0 text-teal-600" />
                Apparaîtra immédiatement dans le planning une fois confirmée.
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {step > 1 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Retour</button>}
          {step < 3 && <button className="btn-primary flex-1 justify-center" onClick={step === 1 ? validate1 : validate2}>Suivant →</button>}
          {step === 3 && <button className="btn-primary flex-1 justify-center" onClick={validate3}>Voir le récap →</button>}
          {step === 4 && <button className="btn-primary flex-1 justify-center" onClick={confirm}><Check size={14} /> Confirmer la location</button>}
        </div>
      </div>
    </div>
  )
}
