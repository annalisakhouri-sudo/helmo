import { useState } from 'react'
import { Plus, X, Upload, Anchor, QrCode, Check, AlertTriangle, ChevronRight, FileText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { BOATS, DOC_LABELS } from '@/lib/mock-data'
import { useOutletContext } from 'react-router-dom'
import { Card, SectionLabel } from '@/components/ui'
import DocUpdateModal from '@/components/ui/DocUpdateModal'

const TYPES = ['Voilier', 'Catamaran', 'Semi-rigide', 'Moteur']
const MODELES = {
  Voilier: ['Dufour 310', 'Dufour 360', 'Dufour 390', 'Dufour 412', 'Jeanneau 379', 'Bénéteau Oceanis 38', 'Autre'],
  Catamaran: ['Elba 45', 'Astrea 42', 'Lagoon 40', 'Fountaine Pajot 44', 'Autre'],
  'Semi-rigide': ['Tempest 505', 'BSC 65', 'BSC 70', 'Joker 580', 'Autre'],
  Moteur: ['Pacific Craft 730', 'Hanse 510', 'Quicksilver 605', 'Autre'],
}
const PORTS = ['Quai de la Criée — Vieux-Port', 'Panne Saint Jean — Vieux-Port', 'Port de la Pointe Rouge', 'Port du Frioul', 'Autre']

const STEPS = ['Infos générales', 'Documents', 'Équipements']

function DocUploadRow({ label, status, onUpload }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${status === 'uploaded' ? 'bg-teal-50 border-teal-100' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${status === 'uploaded' ? 'bg-teal-400' : 'bg-gray-200'}`}>
          {status === 'uploaded' ? <Check size={12} className="text-white" /> : <Upload size={12} className="text-gray-400" />}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-400">{status === 'uploaded' ? 'Document uploadé ✓' : 'PDF ou image requis'}</p>
        </div>
      </div>
      <button
        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${status === 'uploaded' ? 'border-teal-200 text-teal-700 hover:bg-teal-100' : 'border-navy-200 text-navy-600 hover:bg-navy-50'}`}
        onClick={() => onUpload(label)}
      >
        {status === 'uploaded' ? 'Remplacer' : 'Uploader'}
      </button>
    </div>
  )
}

function BoatCard({ boat, onSelect }) {
  const hasIssue = Object.values(boat.docs).some(d => d.status !== 'ok')
  const hasDanger = Object.values(boat.docs).some(d => d.status === 'danger')
  return (
    <div className={`card cursor-pointer hover:shadow-sm transition-all ${hasDanger ? 'border-danger-100' : hasIssue ? 'border-amber-100' : ''}`} onClick={() => onSelect(boat)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
          <Anchor size={18} className="text-navy-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{boat.name}</p>
          <p className="text-xs text-gray-400">{boat.type} · {boat.length}m · {boat.port}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasDanger ? <span className="pill-danger">Doc manquant</span> : hasIssue ? <span className="pill-warn">À renouveler</span> : <span className="pill-ok">Tout OK</span>}
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>
    </div>
  )
}

function DocViewModal({ boat, docKey, doc, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{DOC_LABELS[docKey]}</h2>
            <p className="text-navy-100 text-xs">{boat.name}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText size={28} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium mb-1">{docKey}.pdf</p>
          <p className="text-xs text-gray-400 mb-1">{doc.label}</p>
          {doc.expires && <p className="text-xs text-gray-400">Expire le {new Date(doc.expires).toLocaleDateString('fr-FR')}</p>}
          <p className="text-[10px] text-gray-300 mt-4 italic">Aperçu PDF disponible dès le branchement du stockage de fichiers.</p>
        </div>
      </div>
    </div>
  )
}

function BoatDetail({ boat, onClose, onUpdateDoc, onViewDoc }) {
  const url = `https://helmo.fr/bateau/${boat.id}`
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{boat.name}</h2>
            <p className="text-navy-100 text-xs">{boat.type} · {boat.length}m · {boat.port}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-5">
          <div>
            <SectionLabel>Informations</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ['Type', boat.type],
                ['Longueur', `${boat.length}m`],
                ['Port', boat.port],
                ['Immat.', boat.immat || 'FR-12345-A'],
                ['Cabines', boat.cabines || '3'],
                ['Lits', boat.lits ?? (boat.cabines ? boat.cabines * 2 : 0)],
                ['Capacité', `${boat.capacite || 6} pers.`],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-medium">{val}</p>
                </div>
              ))}
            </div>

            <SectionLabel>Documents</SectionLabel>
            <div className="flex flex-col gap-1.5 mb-4">
              {Object.entries(boat.docs).map(([key, doc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2 px-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`flex items-center gap-2 flex-1 min-w-0 ${doc.status !== 'danger' ? 'cursor-pointer' : ''}`}
                    onClick={() => doc.status !== 'danger' && onViewDoc && onViewDoc(boat, key, doc)}
                  >
                    <FileText size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{DOC_LABELS[key]}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.status === 'ok' && <span className="pill-ok">{doc.label}</span>}
                    {doc.status === 'warn' && <span className="pill-warn">{doc.label}</span>}
                    {doc.status === 'danger' && <span className="pill-danger">{doc.label}</span>}
                    <button
                      className="text-[10px] text-navy-600 hover:underline"
                      onClick={() => onUpdateDoc && onUpdateDoc(boat, key, doc)}
                    >
                      {doc.status === 'danger' ? 'Ajouter' : 'Remplacer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <SectionLabel>Équipements</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {['SUP x2', 'Annexe', 'Taud de soleil', 'Masque & tuba x3'].map(e => (
                <span key={e} className="text-xs bg-navy-50 text-navy-700 px-2.5 py-1 rounded-full">{e}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <SectionLabel>QR code du bateau</SectionLabel>
            <p className="text-xs text-gray-400 text-center mb-4">Collez ce QR code dans le bateau — les locataires scannent pour accéder aux docs</p>
            <div className="border border-gray-100 rounded-xl p-5 mb-3">
              <QRCodeSVG value={url} size={150} fgColor="#042C53" />
            </div>
            <p className="text-xs text-gray-400 mb-4 text-center">{url}</p>
            <button className="btn-primary w-full justify-center" onClick={() => window.print()}>
              <QrCode size={14} /> Télécharger le QR code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NewBoatModal({ onClose, onAdd, activeBrand }) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    nom: '', type: '', modele: '', longueur: '', cabines: '', lits: '', capacite: '',
    port: '', immat: '', equipements: [],
  })
  const [docs, setDocs] = useState({ francisation: '', assurance: '', securite: '', jauge: '' })
  const [errors, setErrors] = useState({})

  function set(k, v) { setForm(f => ({...f, [k]: v})); if(errors[k]) setErrors(e => ({...e, [k]: ''})) }
  function toggleEquip(e) { setForm(f => ({...f, equipements: f.equipements.includes(e) ? f.equipements.filter(x=>x!==e) : [...f.equipements, e]})) }
  function uploadDoc(key) { setDocs(d => ({...d, [key]: 'uploaded'})) }

  function validate0() {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Nom requis'
    if (!form.type) e.type = 'Type requis'
    if (!form.longueur) e.longueur = 'Longueur requise'
    if (!form.port) e.port = 'Port requis'
    if (!form.immat.trim()) e.immat = 'Immatriculation requise'
    if (!form.cabines) e.cabines = 'Requis'
    if (!form.capacite) e.capacite = 'Requis'
    setErrors(e)
    if (!Object.keys(e).length) setStep(1)
  }

  function confirm() {
    onAdd({
      id: 'boat-new-' + Date.now(),
      brand: activeBrand,
      name: form.nom,
      type: form.type,
      modele: form.modele,
      length: parseFloat(form.longueur) || 0,
      cabines: form.cabines,
      lits: form.lits || (form.cabines ? form.cabines * 2 : 0),
      capacite: form.capacite,
      port: form.port,
      immat: form.immat,
      equipements: form.equipements,
      docs: {
        francisation: { status: docs.francisation === 'uploaded' ? 'ok' : 'danger', label: docs.francisation === 'uploaded' ? 'À jour' : 'Manquante', expires: null },
        assurance:    { status: docs.assurance === 'uploaded' ? 'ok' : 'danger', label: docs.assurance === 'uploaded' ? 'À jour' : 'Manquante', expires: null },
        securite:     { status: docs.securite === 'uploaded' ? 'ok' : 'danger', label: docs.securite === 'uploaded' ? 'À jour' : 'Manquante', expires: null },
        jauge:        { status: docs.jauge === 'uploaded' ? 'ok' : 'danger', label: docs.jauge === 'uploaded' ? 'À jour' : 'Manquante', expires: null },
      },
    })
    setDone(true)
  }

  const inp = (k) => `w-full text-sm px-3 py-2 border rounded-lg bg-white transition-colors ${errors[k] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'}`

  if (done) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-teal-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Bateau ajouté !</h2>
        <p className="text-sm text-gray-400 mb-6">Il apparaît maintenant dans votre flotte et dans le planning.</p>
        <div className="flex gap-3">
          <button className="btn-primary flex-1 justify-center" onClick={onClose}>Voir la flotte</button>
          <button className="btn-ghost flex-1 justify-center" onClick={() => { setDone(false); setStep(0); setForm({nom:'',type:'',modele:'',longueur:'',cabines:'',lits:'',capacite:'',port:'',immat:'',equipements:[]}) }}>
            + Autre bateau
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Ajouter un bateau</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className="flex bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-1 py-2.5 text-center text-xs transition-colors ${step === i ? 'bg-white text-navy-600 font-medium border-b-2 border-navy-600' : step > i ? 'text-teal-600' : 'text-gray-400'}`}>
              {step > i && '✓ '}{s}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* ÉTAPE 1 — Infos générales */}
          {step === 0 && (
            <div>
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Nom du bateau <span className="text-danger-600">*</span></p>
                <input className={inp('nom')} placeholder="ex: Bella Mare" value={form.nom} onChange={e => set('nom', e.target.value)} />
                {errors.nom && <p className="text-xs text-danger-600 mt-1">{errors.nom}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Type <span className="text-danger-600">*</span></p>
                  <select className={inp('type')} value={form.type} onChange={e => { set('type', e.target.value); set('modele', '') }}>
                    <option value="">-- Sélectionner --</option>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  {errors.type && <p className="text-xs text-danger-600 mt-1">{errors.type}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Modèle</p>
                  <select className={inp('modele')} value={form.modele} onChange={e => set('modele', e.target.value)} disabled={!form.type}>
                    <option value="">-- Sélectionner --</option>
                    {(MODELES[form.type] || []).map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Longueur (m) <span className="text-danger-600">*</span></p>
                  <input className={inp('longueur')} type="number" placeholder="10.5" value={form.longueur} onChange={e => set('longueur', e.target.value)} />
                  {errors.longueur && <p className="text-xs text-danger-600 mt-1">{errors.longueur}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Cabines <span className="text-danger-600">*</span></p>
                  <select className={inp('cabines')} value={form.cabines} onChange={e => set('cabines', e.target.value)}>
                    <option value="">—</option>
                    {[0,1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}
                  </select>
                  {errors.cabines && <p className="text-xs text-danger-600 mt-1">{errors.cabines}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Lits</p>
                  <select className={inp('lits')} value={form.lits} onChange={e => set('lits', e.target.value)}>
                    <option value="">—</option>
                    {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n}>{n}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Sert à adapter les draps du check-in</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Capacité max <span className="text-danger-600">*</span></p>
                  <select className={inp('capacite')} value={form.capacite} onChange={e => set('capacite', e.target.value)}>
                    <option value="">—</option>
                    {[2,3,4,5,6,7,8,10,12].map(n => <option key={n}>{n} pers.</option>)}
                  </select>
                  {errors.capacite && <p className="text-xs text-danger-600 mt-1">{errors.capacite}</p>}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Port d'attache <span className="text-danger-600">*</span></p>
                <select className={inp('port')} value={form.port} onChange={e => set('port', e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {PORTS.map(p => <option key={p}>{p}</option>)}
                </select>
                {errors.port && <p className="text-xs text-danger-600 mt-1">{errors.port}</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5">Numéro d'immatriculation <span className="text-danger-600">*</span></p>
                <input className={inp('immat')} placeholder="ex: FR-13001-A" value={form.immat} onChange={e => set('immat', e.target.value)} />
                {errors.immat && <p className="text-xs text-danger-600 mt-1">{errors.immat}</p>}
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Documents */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Uploadez les documents obligatoires. Vous pourrez les compléter plus tard.</p>
              <div className="flex flex-col gap-3">
                {Object.entries(DOC_LABELS).map(([key, label]) => (
                  <DocUploadRow key={key} label={label} status={docs[key]} onUpload={() => uploadDoc(key)} />
                ))}
              </div>
              {Object.values(docs).some(d => d !== 'uploaded') && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 mt-4">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Les documents manquants seront signalés comme alertes. Vous pouvez continuer et les ajouter plus tard.</p>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 — Équipements */}
          {step === 2 && (
            <div>
              <p className="text-sm text-gray-400 mb-4">Sélectionnez les équipements disponibles à bord.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'sup', label: 'SUP', icon: '🏄', sub: true },
                  { id: 'annexe', label: 'Annexe / zodiac', icon: '🚣' },
                  { id: 'taud', label: 'Taud de soleil', icon: '☀️' },
                  { id: 'masque', label: 'Masque & tuba', icon: '🤿', sub: true },
                  { id: 'carbu', label: 'Carburant fourni', icon: '⛽' },
                  { id: 'vhf', label: 'VHF à bord', icon: '📡' },
                ].map(eq => (
                  <div key={eq.id}
                    className={`border rounded-xl p-3 cursor-pointer transition-all ${form.equipements.includes(eq.id) ? 'border-navy-600 bg-navy-50' : 'border-gray-100 hover:border-gray-200'}`}
                    onClick={() => toggleEquip(eq.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{eq.icon}</span>
                        <span className={`text-sm font-medium ${form.equipements.includes(eq.id) ? 'text-navy-800' : ''}`}>{eq.label}</span>
                      </div>
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${form.equipements.includes(eq.id) ? 'bg-navy-600' : 'border border-gray-300'}`}>
                        {form.equipements.includes(eq.id) && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {step > 0 && <button className="btn-ghost" onClick={() => setStep(s => s-1)}>← Retour</button>}
          {step < 2 && <button className="btn-primary flex-1 justify-center" onClick={step === 0 ? validate0 : () => setStep(2)}>Suivant →</button>}
          {step === 2 && <button className="btn-primary flex-1 justify-center" onClick={confirm}><Check size={14} /> Ajouter le bateau</button>}
        </div>
      </div>
    </div>
  )
}

export default function Bateaux() {
  const { activeBrand } = useOutletContext()
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState(null)
  const [extraBoats, setExtraBoats] = useState([])
  const [updateTarget, setUpdateTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)

  const allBoats = [...BOATS, ...extraBoats].filter(b => b.brand === activeBrand)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Mes bateaux</h1>
          <p className="text-xs text-gray-400">{allBoats.length} bateaux · {activeBrand === 'midi-nautisme' ? 'Midi Nautisme' : 'Locamotors'}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Ajouter un bateau</button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="flex flex-col gap-3">
          {allBoats.map(boat => <BoatCard key={boat.id} boat={boat} onSelect={setSelected} />)}
        </div>
      </div>

      {showNew && <NewBoatModal activeBrand={activeBrand} onClose={() => setShowNew(false)} onAdd={b => { setExtraBoats(prev => [...prev, b]); setShowNew(false) }} />}
      {selected && (
        <BoatDetail
          boat={selected}
          onClose={() => setSelected(null)}
          onUpdateDoc={(boat, key, doc) => setUpdateTarget({ boat, key, doc })}
          onViewDoc={(boat, key, doc) => setViewTarget({ boat, key, doc })}
        />
      )}
      {viewTarget && (
        <DocViewModal
          boat={viewTarget.boat}
          docKey={viewTarget.key}
          doc={viewTarget.doc}
          onClose={() => setViewTarget(null)}
        />
      )}
      {updateTarget && (
        <DocUpdateModal
          title={updateTarget.boat.name}
          docLabel={DOC_LABELS[updateTarget.key]}
          currentExpiry={updateTarget.doc.expires}
          onClose={() => setUpdateTarget(null)}
          onSave={({ expiry, noExpiry }) => {
            updateTarget.doc.status = 'ok'
            updateTarget.doc.label = 'À jour'
            updateTarget.doc.expires = noExpiry ? null : expiry
          }}
        />
      )}
    </div>
  )
}
