import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, X, PenLine, CircleCheck, AlertTriangle, FileText } from 'lucide-react'

const CHECKLIST = [
  {
    category: '🔴 Sécurité obligatoire',
    items: [
      { id: 's1', label: 'Gilets de sauvetage', max: 12 },
      { id: 's2', label: 'Fusées de détresse', max: 6 },
      { id: 's3', label: 'Extincteur', max: 2 },
      { id: 's4', label: 'Balise EPIRB', max: 1 },
      { id: 's5', label: 'Couverture de survie', max: 4 },
      { id: 's6', label: 'Corne de brume', max: 1 },
      { id: 's7', label: 'Trousse premiers secours', max: 1 },
      { id: 's8', label: 'Ancre + chaîne', max: 1 },
    ]
  },
  {
    category: '🍽 Cuisine & vaisselle',
    items: [
      { id: 'c1', label: 'Assiettes', max: 12 },
      { id: 'c2', label: 'Bols', max: 12 },
      { id: 'c3', label: 'Verres', max: 12 },
      { id: 'c4', label: 'Tasses', max: 12 },
      { id: 'c5', label: 'Couverts complets', max: 12 },
      { id: 'c6', label: 'Casseroles', max: 4 },
      { id: 'c7', label: 'Poêle', max: 2 },
      { id: 'c8', label: 'Ouvre-boîte', max: 2 },
      { id: 'c9', label: 'Tire-bouchon', max: 2 },
      { id: 'c10', label: 'Planche à découper', max: 2 },
    ]
  },
  {
    category: '🛏 Cabines & confort',
    items: [
      { id: 'b1', label: 'Oreillers', max: 12 },
      { id: 'b2', label: 'Couvertures', max: 6 },
      { id: 'b3', label: 'Rouleaux papier toilette', max: 12 },
      { id: 'b4', label: 'Produit vaisselle', max: 2 },
      { id: 'b5', label: 'Éponges', max: 4 },
      { id: 'b6', label: 'Poubelles avec sacs', max: 4 },
    ]
  },
  {
    category: '⚓ Équipement nautique',
    items: [
      { id: 'n1', label: 'Jerricane carburant (plein)', max: 4 },
      { id: 'n2', label: 'Fenders', max: 8 },
      { id: 'n3', label: 'Aussières', max: 6 },
      { id: 'n4', label: 'Gaffe', max: 1 },
      { id: 'n5', label: 'Pagaies SUP', max: 4 },
      { id: 'n6', label: 'Gilets SUP', max: 4 },
      { id: 'n7', label: 'Masques & tubas', max: 6 },
    ]
  },
]

const ALL_ITEMS = CHECKLIST.flatMap(c => c.items)

export default function CheckIn({ booking, onClose, onComplete }) {
  const [checked, setChecked] = useState({})
  const [missing, setMissing] = useState({})
  const [remarks, setRemarks] = useState('')
  const [collapsed, setCollapsed] = useState({})
  const [step, setStep] = useState('checklist')
  const [signature, setSignature] = useState(false)

  const total = ALL_ITEMS.length
  const done = Object.values(checked).filter(Boolean).length
  const pct = Math.round((done / total) * 100)
  const unchecked = ALL_ITEMS.filter(item => !checked[item.id])
  const hasMissing = unchecked.length > 0

  function toggle(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id]) {
        setMissing(m => { const n = { ...m }; delete n[id]; return n })
      }
      return next
    })
  }

  function setMissingQty(id, qty) {
    setMissing(prev => ({ ...prev, [id]: qty }))
  }

  function toggleCategory(cat) {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  function checkAll(cat) {
    const items = CHECKLIST.find(c => c.category === cat)?.items || []
    const allChecked = items.every(item => checked[item.id])
    const updates = {}
    items.forEach(item => { updates[item.id] = !allChecked })
    setChecked(prev => ({ ...prev, ...updates }))
  }

  function isCatComplete(cat) {
    const items = CHECKLIST.find(c => c.category === cat)?.items || []
    return items.every(item => checked[item.id])
  }

  if (step === 'done') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <CircleCheck size={36} className="text-teal-400" />
        </div>
        <h2 className="font-display text-xl font-bold mb-2">Check-in terminé !</h2>
        <p className="text-sm text-gray-400 mb-1">Signé par {booking.client} · {new Date().toLocaleDateString('fr-FR')}</p>
        <p className="text-sm text-gray-400 mb-4">{done}/{total} points vérifiés</p>
        {hasMissing && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-medium text-amber-800 mb-1">⚠ Éléments manquants notés</p>
            {unchecked.map(item => (
              <p key={item.id} className="text-xs text-amber-700">
                — {item.label}{missing[item.id] ? ` (${missing[item.id]} manquant${missing[item.id] > 1 ? 's' : ''})` : ''}
              </p>
            ))}
            {remarks && <p className="text-xs text-amber-700 mt-1">Remarques : {remarks}</p>}
          </div>
        )}
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 mb-6 text-left">
          <p className="text-xs font-medium text-teal-800 mb-1">📄 État des lieux généré</p>
          <p className="text-xs text-teal-700">Le PDF a été ajouté automatiquement à la fiche de location <strong>{booking.client}</strong>.</p>
        </div>
        <button className="btn-primary w-full justify-center" onClick={() => { onComplete && onComplete(); onClose() }}>
          Retour à la location
        </button>
      </div>
    </div>
  )

  if (step === 'recap') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Récapitulatif</h2>
          <button onClick={() => setStep('checklist')} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-teal-800">✓ {done} points vérifiés sur {total}</p>
          </div>
          {hasMissing && (
            <div className="mb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Éléments manquants ou non vérifiés</p>
              <div className="flex flex-col gap-2">
                {unchecked.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-xs text-amber-800">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-600">Qté manquante :</span>
                      <select
                        className="text-xs border border-amber-200 rounded px-1.5 py-0.5 bg-white text-amber-800"
                        value={missing[item.id] || '0'}
                        onChange={e => setMissingQty(item.id, e.target.value)}
                      >
                        {Array.from({length: item.max + 1}, (_, i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Remarques & observations</p>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600"
              rows={3}
              placeholder="Ex: rayure sur le roof bâbord, moteur annexe difficile à démarrer..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        </div>
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={() => setStep('checklist')}>← Retour</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => setStep('signature')}>
            <PenLine size={14} /> Passer à la signature
          </button>
        </div>
      </div>
    </div>
  )

  if (step === 'signature') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-white text-base font-bold">Signature client</h2>
          <button onClick={() => setStep('recap')} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
            <p className="font-medium mb-1">{booking.client} — {booking.boatName}</p>
            <p className="text-gray-400 text-xs">Départ le {booking.start} · {done}/{total} points vérifiés</p>
            {hasMissing && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-amber-700 font-medium">⚠ {unchecked.length} élément{unchecked.length > 1 ? 's' : ''} non vérifié{unchecked.length > 1 ? 's' : ''}</p>
                {unchecked.map(item => (
                  <p key={item.id} className="text-xs text-amber-600">
                    — {item.label}{missing[item.id] && missing[item.id] !== '0' ? ` (${missing[item.id]} manquant${missing[item.id] > 1 ? 's' : ''})` : ''}
                  </p>
                ))}
              </div>
            )}
            {remarks && <p className="text-xs text-gray-500 mt-2 italic">"{remarks}"</p>}
          </div>
          <p className="text-xs text-gray-400 mb-3">Je soussigné(e) confirme avoir pris connaissance de l'état des lieux ci-dessus.</p>
          <div
            className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4 ${signature ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-navy-300'}`}
            onClick={() => setSignature(true)}
          >
            {signature ? (
              <div className="text-center">
                <p className="text-teal-700 font-medium text-sm">✓ Signé</p>
                <p className="text-teal-600 text-xs mt-1">{booking.client}</p>
              </div>
            ) : (
              <div className="text-center">
                <PenLine size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Appuyez pour signer</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setStep('recap')}>← Retour</button>
            <button
              className={`btn-primary flex-1 justify-center ${!signature ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!signature}
              onClick={() => setStep('done')}
            >
              <CircleCheck size={14} /> Valider le check-in
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Check-in — {booking.boatName}</h2>
            <p className="text-navy-100 text-xs">{booking.client} · Départ {booking.start}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        {/* Barre de progression */}
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">{done}/{total} points vérifiés</span>
            <span className={`text-xs font-medium ${pct === 100 ? 'text-teal-600' : pct > 50 ? 'text-amber-600' : 'text-gray-400'}`}>{pct}%</span>
          </div>
          <div className="bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${pct === 100 ? 'bg-teal-400' : pct > 50 ? 'bg-amber-300' : 'bg-navy-400'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-auto p-4">
          {CHECKLIST.map(cat => {
            const catDone = isCatComplete(cat.category)
            const isCollapsed = collapsed[cat.category]
            const catChecked = cat.items.filter(item => checked[item.id]).length

            return (
              <div key={cat.category} className="mb-3">
                <div
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${catDone ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50 border border-gray-100'}`}
                  onClick={() => toggleCategory(cat.category)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${catDone ? 'bg-teal-400' : 'bg-gray-200'}`}>
                      {catDone && <Check size={10} className="text-white" />}
                    </div>
                    <span className={`text-sm font-medium ${catDone ? 'text-teal-800' : ''}`}>{cat.category}</span>
                    <span className="text-xs text-gray-400">{catChecked}/{cat.items.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-[10px] text-navy-600 hover:underline" onClick={e => { e.stopPropagation(); checkAll(cat.category) }}>
                      {cat.items.every(i => checked[i.id]) ? 'Tout décocher' : 'Tout cocher'}
                    </button>
                    {isCollapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="mt-1 flex flex-col gap-1 pl-2">
                    {cat.items.map(item => {
                      const isChecked = !!checked[item.id]
                      return (
                        <div key={item.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-teal-50' : 'hover:bg-gray-50'}`} onClick={() => toggle(item.id)}>
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${isChecked ? 'bg-teal-400 border-teal-400' : 'border border-gray-300'}`}>
                            {isChecked && <Check size={9} className="text-white" />}
                          </div>
                          <span className={`text-sm flex-1 ${isChecked ? 'text-teal-800 line-through opacity-60' : 'text-gray-700'}`}>{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          {hasMissing && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">{unchecked.length} élément{unchecked.length > 1 ? 's' : ''} non coché{unchecked.length > 1 ? 's' : ''} — vous pourrez noter les quantités manquantes à l'étape suivante.</p>
            </div>
          )}
          <button className="btn-primary w-full justify-center" onClick={() => setStep('recap')}>
            <FileText size={14} /> {hasMissing ? 'Continuer et noter les manquants' : 'Passer au récapitulatif'}
          </button>
        </div>
      </div>
    </div>
  )
}
