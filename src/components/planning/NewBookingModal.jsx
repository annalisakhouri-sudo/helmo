import { useState } from 'react'
import { X, AlertTriangle, Check, CircleCheck, FileText, Send } from 'lucide-react'
import { BOATS, SKIPPERS, OPTIONS_CATALOG, PRICING_PERIODS, BOAT_PRICES, CONTRACT_TEMPLATES, MENAGE_PROVIDERS, CLIENTS } from '@/lib/mock-data'
import { getDefaultMenageForBoat } from '@/lib/menage-missions'
import { sendSkipperRequest } from '@/lib/skipper-requests'
import { buildContractContent, getDefaultTemplateId } from '@/lib/contract'
import { setContractTemplate, sendContract } from '@/lib/shared-state'
import OptionIcon from '@/components/ui/OptionIcon'
import DateRangePicker from './DateRangePicker'
import { fmtDate, fmtRange } from '@/lib/dates'

// Trouve la période tarifaire correspondant à une date, et calcule le prix de location
// en fonction du bateau et du nombre de semaines.
function findPeriod(dateStr) {
  if (!dateStr) return null
  return PRICING_PERIODS.find(p => dateStr >= p.start && dateStr <= p.end) || null
}

function computeBasePrice(boatId, dateStart, dateEnd) {
  if (!boatId || !dateStart || !dateEnd) return null
  const period = findPeriod(dateStart)
  if (!period) return null
  const weeklyPrice = BOAT_PRICES[boatId]?.[period.id]
  if (!weeklyPrice) return null
  const days = Math.max(1, Math.round((new Date(dateEnd) - new Date(dateStart)) / (1000 * 60 * 60 * 24)))
  const weeks = days / 7
  return { period, weeklyPrice, total: Math.round(weeklyPrice * weeks) }
}

const STEPS = [
  { id: 1, label: 'Bateau & dates', icon: '⛵' },
  { id: 2, label: 'Client', icon: '👤' },
  { id: 3, label: 'Options', icon: '⚙️' },
  { id: 4, label: 'Contrat', icon: '📄' },
  { id: 5, label: 'Récap', icon: '✓' },
]

const OPTIONS = OPTIONS_CATALOG.filter(o => o.active)

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
    nom: '', prenom: '', tel: '', email: '', clientId: '',
    options: {}, freeOptions: {}, basePrice: '', basePriceAuto: null, discountPercent: '0',
    skipperName: '', skipperId: '', menageProviderId: '', cabines: '3', supQty: '2', masqueQty: '3', franchise: '1500', statut: 'confirmed', dureeOption: '48h', lastNightAboard: true,
  })

  const [clientQuery, setClientQuery] = useState('')
  const norm = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s/g, '')
  const clientMatches = clientQuery.trim().length >= 2
    ? CLIENTS.filter(c => norm(`${c.prenom}${c.nom}${c.nom}${c.prenom}${c.tel}${c.email}`).includes(norm(clientQuery))).slice(0, 5)
    : []
  const selectedClient = CLIENTS.find(c => c.id === form.clientId)
  function chooseClient(c) {
    setForm(f => ({ ...f, clientId: c.id, nom: c.nom, prenom: c.prenom, tel: c.tel, email: c.email || '' }))
    setClientQuery('')
    setErrors(e => ({ ...e, nom: '', prenom: '', tel: '' }))
  }
  function clearClient() {
    setForm(f => ({ ...f, clientId: '', nom: '', prenom: '', tel: '', email: '' }))
  }

  const [contractTemplateId, setContractTemplateId] = useState(null)
  const [contractContent, setContractContent] = useState(null)
  const [sendContractNow, setSendContractNow] = useState(false)

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val }
      // Recalcul automatique du prix de base dès que le bateau ou les dates changent
      if (['boatId', 'dateStart', 'dateEnd'].includes(key)) {
        const computed = computeBasePrice(next.boatId, next.dateStart, next.dateEnd)
        if (computed) {
          next.basePriceAuto = computed
          // On ne remplace le prix manuel que s'il n'a pas été modifié à la main,
          // ou si le bateau/dates viennent de changer
          next.basePrice = String(computed.total)
        }
      }
      return next
    })
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  function toggleOpt(id) {
    setForm(f => ({
      ...f,
      options: { ...f.options, [id]: !f.options[id] },
      // Ménage coché : société présélectionnée = celle qui s'occupe habituellement de ce bateau.
      ...(id === 'menage' && !f.options.menage && !f.menageProviderId ? { menageProviderId: getDefaultMenageForBoat(f.boatId)?.id || MENAGE_PROVIDERS[0]?.id || '' } : {}),
    }))
    if (id === 'franchise' && errors.franchise) setErrors(e => ({ ...e, franchise: '' }))
    // Si on décoche une option, on retire aussi son statut "offerte"
    setForm(f => {
      if (f.options[id]) {
        const nextFree = { ...f.freeOptions }
        delete nextFree[id]
        return { ...f, freeOptions: nextFree }
      }
      return f
    })
  }

  function toggleFree(id) {
    setForm(f => ({ ...f, freeOptions: { ...f.freeOptions, [id]: !f.freeOptions[id] } }))
  }

  function validate1() {
    const e = {}
    if (!form.boatId) e.boatId = 'Sélectionne un bateau.'
    if (!form.dateStart) e.dateStart = 'Date de début requise.'
    if (!form.dateEnd) e.dateEnd = 'Date de fin requise.'
    else if (form.dateEnd < form.dateStart) e.dateEnd = 'La date de fin doit être après le début.'
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
    if (!Object.keys(e).length) {
      setStep(4)
      if (!contractContent) {
        const tpl = getDefaultTemplateId(BOATS.find(b => b.id === form.boatId))
        setContractTemplateId(tpl)
        setContractContent(buildContractContent(buildBookingFromForm(), tpl))
      }
    }
  }

  function buildBookingFromForm() {
    const boat = BOATS.find(b => b.id === form.boatId)
    return {
      boatId: form.boatId,
      boatName: boat?.name || '',
      brand: activeBrand,
      client: `${form.prenom} ${form.nom}`.trim(),
      phone: form.tel,
      guests: form.guests,
      start: form.dateStart,
      end: form.dateEnd,
      draps: form.options.draps ? [{ name: `${form.cabines} cabine(s)`, qty: parseInt(form.cabines), unit: 'jeux' }] : [],
      options: form.options,
    }
  }

  function regenerateContract(templateId) {
    setContractTemplateId(templateId)
    setContractContent(buildContractContent(buildBookingFromForm(), templateId))
  }

  function validate4() {
    setStep(5)
  }

  function confirm() {
    const boat = BOATS.find(b => b.id === form.boatId)
    const newId = 'bk-new-' + Date.now()
    onAdd && onAdd({
      id: newId,
      boatId: form.boatId,
      boatName: boat?.name || '',
      brand: activeBrand,
      clientId: form.clientId || null,
      client: form.nom + ' ' + form.prenom,
      phone: form.tel,
      guests: form.guests,
      start: form.dateStart,
      end: form.dateEnd,
      skipperName: null,
      needsSkipper: !!form.options.skipper,
      menageProviderId: form.options.menage ? form.menageProviderId : null,
      draps: form.options.draps ? [{ name: `${form.cabines} cabine(s)`, qty: parseInt(form.cabines), unit: 'jeux' }] : [],
      status: form.options.skipper ? 'confirmed' : 'confirmed',
      color: 'teal',
      options: form.options,
      freeOptions: form.freeOptions,
      basePrice: parseFloat(form.basePrice) || 0,
      discountPercent: parseFloat(form.discountPercent) || 0,
      lastNightAboard: form.lastNightAboard,
    }, { nom: form.nom, prenom: form.prenom, email: form.email })
    // Skipper choisi à la création → vraie demande (il est affecté quand il accepte).
    if (form.options.skipper && form.skipperId) {
      sendSkipperRequest({ id: newId, boatName: boat?.name || '', start: form.dateStart, end: form.dateEnd, guests: form.guests }, form.skipperId)
    }
    if (contractContent) {
      setContractTemplate(newId, contractTemplateId, contractContent)
      if (sendContractNow) sendContract(newId)
    }
    setDone(true)
  }

  const inputClass = (field) =>
    `w-full text-sm px-3 py-2 border rounded-lg bg-white text-gray-800 transition-colors ${
      errors[field] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'
    }`

  const boat = BOATS.find(b => b.id === form.boatId)
  const selectedOpts = OPTIONS.filter(o => form.options[o.id])
  const optionsTotal = selectedOpts.reduce((acc, o) => acc + (form.freeOptions[o.id] ? 0 : (o.price || 0)), 0)

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
          <button className="btn-ghost flex-1 justify-center" onClick={() => { setDone(false); setStep(1); setForm({ boatId:'',dateStart:'',dateEnd:'',guests:'',nom:'',prenom:'',tel:'',email:'',options:{},skipperName:'',skipperId:'',menageProviderId:'',freeOptions:{},cabines:'3',supQty:'2',masqueQty:'3',franchise:'1500' }) }}>
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

              <Field label="Nuitée à bord (dernière nuit avant restitution)">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: true, label: 'Oui', sub: 'Dort à bord vendredi soir, part samedi ~10h' },
                    { id: false, label: 'Non', sub: 'Rend le bateau vendredi soir' },
                  ].map(opt => (
                    <div
                      key={String(opt.id)}
                      className={`border rounded-xl p-3 cursor-pointer transition-all ${form.lastNightAboard === opt.id ? 'border-navy-600 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => set('lastNightAboard', opt.id)}
                    >
                      <p className={`text-sm font-medium ${form.lastNightAboard === opt.id ? 'text-navy-800' : ''}`}>{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="Dates de location" required error={errors.dateStart || errors.dateEnd}>
                <DateRangePicker
                  brand={activeBrand}
                  dateStart={form.dateStart}
                  dateEnd={form.dateEnd}
                  lastNightAboard={form.lastNightAboard}
                  onChange={({ dateStart, dateEnd }) => {
                    set('dateStart', dateStart)
                    if (dateEnd) set('dateEnd', dateEnd)
                  }}
                />
              </Field>

              <Field label="Personnes à bord" required error={errors.guests}>
                <select className={inputClass('guests')} value={form.guests} onChange={e => set('guests', e.target.value)}>
                  <option value="">-- Nombre de personnes --</option>
                  {[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n} personne{n > 1 ? 's' : ''}</option>)}
                </select>
              </Field>

              {form.boatId && form.dateStart && form.dateEnd && (
                <Field label="Prix de la location">
                  {form.basePriceAuto ? (
                    <div className="bg-navy-50 border border-navy-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: form.basePriceAuto.period.color }} />
                          <span className="text-xs text-navy-700">{form.basePriceAuto.period.label} · {form.basePriceAuto.weeklyPrice}€/semaine</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">Prix (€)</p>
                          <input
                            type="number"
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-600"
                            value={form.basePrice}
                            onChange={e => setForm(f => ({ ...f, basePrice: e.target.value }))}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">Remise (%)</p>
                          <input
                            type="number"
                            min="0" max="100"
                            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-600"
                            value={form.discountPercent}
                            onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))}
                          />
                        </div>
                      </div>
                      {parseFloat(form.discountPercent) > 0 && (
                        <p className="text-xs text-teal-700 mt-2 font-medium">
                          Prix net : {Math.round(parseFloat(form.basePrice || 0) * (1 - parseFloat(form.discountPercent || 0) / 100))}€
                          <span className="text-gray-400 font-normal"> (remise visible sur le devis client)</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                      Aucun tarif défini pour ce bateau sur cette période. <a href="/options" className="underline">Configurer les tarifs →</a>
                    </div>
                  )}
                </Field>
              )}
            </div>
          )}

                    {/* Statut */}
            <Field label="Statut de la réservation" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'confirmed', label: '✅ Confirmée', sub: 'La loc est ferme' },
                  { id: 'option', label: '⏳ Option', sub: 'Créneau réservé temporairement' },
                ].map(s => (
                  <div
                    key={s.id}
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${form.statut === s.id ? 'border-navy-600 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => set('statut', s.id)}
                  >
                    <p className={`text-sm font-medium ${form.statut === s.id ? 'text-navy-800' : ''}`}>{s.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
              {form.statut === 'option' && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1.5">Durée de l'option</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['24h', '48h', '3 jours', '7 jours'].map(d => (
                      <div
                        key={d}
                        className={`border rounded-lg py-2 text-center text-xs cursor-pointer transition-all ${form.dureeOption === d ? 'border-navy-600 bg-navy-50 text-navy-800 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        onClick={() => set('dureeOption', d)}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    ⏳ L'option sera automatiquement annulée après {form.dureeOption} si non confirmée.
                  </p>
                </div>
              )}
            </Field>

          {/* ÉTAPE 2 */}
          {step === 2 && (
            <div>
              {selectedClient ? (
                <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-teal-50 border border-teal-100">
                  <Check size={14} className="text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-800">Client existant · {selectedClient.locations.length} location{selectedClient.locations.length > 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-teal-700">
                      {[!selectedClient.pieceId.uploaded && "pièce d'identité", selectedClient.permis.type && !selectedClient.permis.uploaded && 'permis', selectedClient.caution.statut !== 'recue' && 'caution'].filter(Boolean).join(', ') || 'Dossier complet'}
                      {[!selectedClient.pieceId.uploaded, selectedClient.permis.type && !selectedClient.permis.uploaded, selectedClient.caution.statut !== 'recue'].some(Boolean) && ' à compléter'}
                    </p>
                  </div>
                  <button type="button" className="text-[11px] text-gray-500 hover:text-navy-600" onClick={clearClient}>Changer</button>
                </div>
              ) : (
                <div className="mb-4 relative">
                  <input
                    type="text"
                    className="w-full text-sm px-3 py-2.5 border border-navy-100 rounded-xl bg-navy-50 focus:outline-none focus:border-navy-600 focus:bg-white"
                    placeholder="Client déjà venu ? Tape son nom ou son téléphone…"
                    value={clientQuery}
                    onChange={e => setClientQuery(e.target.value)}
                  />
                  {clientMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
                      {clientMatches.map(c => (
                        <button key={c.id} type="button" className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50" onClick={() => chooseClient(c)}>
                          <span className="text-sm">{c.prenom} {c.nom}</span>
                          <span className="text-[11px] text-gray-400">{c.tel} · {c.locations.length} loc.</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">Nouveau client ? Remplis les champs ci-dessous : sa fiche est créée automatiquement, et les documents manquants te seront rappelés dans Clients.</p>
                </div>
              )}
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
                      <OptionIcon name={opt.icon} size={16} className="text-navy-600" />
                      <span className={`text-sm font-medium ${form.options[opt.id] ? 'text-navy-800' : ''}`}>{opt.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${form.options[opt.id] ? 'bg-navy-600 border-navy-600' : 'border border-gray-300'}`}>
                      {form.options[opt.id] && <Check size={10} className="text-white" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-gray-400">
                      {form.freeOptions[opt.id]
                        ? <span className="text-teal-600 font-medium line-through decoration-1">{opt.price}€ {opt.unit}</span>
                        : `${opt.price}€ ${opt.unit}`
                      }
                      {form.freeOptions[opt.id] && <span className="text-teal-600 font-medium ml-1.5">Offert</span>}
                    </p>
                    {form.options[opt.id] && (
                      <button
                        type="button"
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${form.freeOptions[opt.id] ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        onClick={e => { e.stopPropagation(); toggleFree(opt.id) }}
                      >
                        {form.freeOptions[opt.id] ? '✓ Offerte' : 'Offrir'}
                      </button>
                    )}
                  </div>

                  {form.options[opt.id] && opt.id === 'menage' && (
                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                      <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.menageProviderId} onChange={e => set('menageProviderId', e.target.value)}>
                        {MENAGE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.company}{getDefaultMenageForBoat(form.boatId)?.id === p.id ? ' (habituelle)' : ''}</option>)}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Demande + facture de {opt.price}€ envoyées à la société, à confirmer de son côté.</p>
                    </div>
                  )}

                  {form.options[opt.id] && opt.hasSub && (
                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                      {opt.id === 'skipper' && (
                        <div>
                          <select className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.skipperId} onChange={e => set('skipperId', e.target.value)}>
                            <option value="">Choisir plus tard</option>
                            {SKIPPERS.map(s => <option key={s.id} value={s.id}>{s.name} — {s.rate}€/j</option>)}
                          </select>
                          <p className="text-[10px] text-gray-400 mt-1">{form.skipperId ? 'Une demande lui sera envoyée ; il est affecté dès qu\'il accepte.' : 'Tu pourras le choisir depuis la fiche de la location.'}</p>
                        </div>
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

          {/* ÉTAPE 4 — CONTRAT */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">Modèle de contrat</p>
                <select
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  value={contractTemplateId || ''}
                  onChange={e => regenerateContract(e.target.value)}
                >
                  {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <textarea
                className="w-full h-80 text-xs border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed font-sans mb-4"
                value={contractContent || ''}
                onChange={e => setContractContent(e.target.value)}
              />
              <label className="flex items-start gap-2.5 bg-navy-50 border border-navy-100 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={sendContractNow}
                  onChange={e => setSendContractNow(e.target.checked)}
                />
                <div>
                  <p className="text-sm font-medium text-navy-800">Envoyer le contrat au client dès la création</p>
                  <p className="text-xs text-navy-600">Sinon, il reste en brouillon et tu pourras l'envoyer plus tard depuis la fiche location.</p>
                </div>
              </label>
            </div>
          )}

          {/* ÉTAPE 5 — RÉCAP */}
          {step === 5 && (
            <div>
              <div className="card mb-4 py-2 px-4">
                {[
                  ['Bateau', boat?.name || '—'],
                  ['Dates', fmtRange(form.dateStart, form.dateEnd)],
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
              {parseFloat(form.basePrice) > 0 && (
                <>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Prix de la location</p>
                  <div className="card mb-4 py-1 px-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                      <span className="text-gray-600">Prix de base</span>
                      <span className="font-medium text-navy-600">{form.basePrice}€</span>
                    </div>
                    {parseFloat(form.discountPercent) > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-50 text-sm">
                        <span className="text-gray-600">Remise</span>
                        <span className="font-medium text-teal-600">-{form.discountPercent}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 text-sm font-semibold">
                      <span>Prix net location</span>
                      <span className="text-navy-600">{Math.round(parseFloat(form.basePrice || 0) * (1 - parseFloat(form.discountPercent || 0) / 100))}€</span>
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Options</p>
              {selectedOpts.length > 0 ? (
                <div className="card mb-4 py-1 px-4">
                  {selectedOpts.map(o => (
                    <div key={o.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm">
                      <span className="text-gray-600">{o.label}{form.freeOptions[o.id] && <span className="text-teal-600 text-xs ml-1.5">(offerte)</span>}</span>
                      {form.freeOptions[o.id]
                        ? <span className="font-medium text-teal-600">Offert</span>
                        : <span className="font-medium text-navy-600">{o.price}€ <span className="text-[10px] text-gray-400">{o.unit}</span></span>
                      }
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-2 text-sm font-semibold">
                    <span>Total options</span>
                    <span className="text-navy-600">{optionsTotal}€</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">Aucune option sélectionnée</p>
              )}

              {form.options.menage && (
                <div className="flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-lg p-3 text-xs text-navy-700 mb-3">
                  <Check size={13} className="flex-shrink-0 text-navy-600" />
                  Ménage : demande et facture envoyées à {MENAGE_PROVIDERS.find(p => p.id === form.menageProviderId)?.company}. Il entre dans son planning dès qu'elle accepte.
                </div>
              )}
              {form.options.skipper && form.skipperId && (
                <div className="flex items-center gap-2 bg-navy-50 border border-navy-100 rounded-lg p-3 text-xs text-navy-700 mb-3">
                  <Check size={13} className="flex-shrink-0 text-navy-600" />
                  Skipper : demande envoyée à {SKIPPERS.find(s => s.id === form.skipperId)?.name}. Affecté dès qu'il accepte.
                </div>
              )}
              {(parseFloat(form.basePrice) > 0 || optionsTotal > 0) && (
                <div className="flex items-center justify-between bg-navy-900 rounded-xl p-4 mb-4">
                  <span className="text-sm font-medium text-white">Total général</span>
                  <span className="font-display text-xl font-bold text-white">
                    {Math.round(parseFloat(form.basePrice || 0) * (1 - parseFloat(form.discountPercent || 0) / 100)) + optionsTotal}€
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-800">
                <Check size={14} className="flex-shrink-0 text-teal-600" />
                Apparaîtra immédiatement dans le planning, la fiche client et les missions techniciens.
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {step > 1 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Retour</button>}
          {step < 3 && <button className="btn-primary flex-1 justify-center" onClick={step === 1 ? validate1 : validate2}>Suivant →</button>}
          {step === 3 && <button className="btn-primary flex-1 justify-center" onClick={validate3}>Voir le contrat →</button>}
          {step === 4 && <button className="btn-primary flex-1 justify-center" onClick={validate4}>Voir le récap →</button>}
          {step === 5 && <button className="btn-primary flex-1 justify-center" onClick={confirm}><Check size={14} /> Confirmer la location</button>}
        </div>
      </div>
    </div>
  )
}
