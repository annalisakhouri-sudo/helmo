import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Plus, X, Check, Pencil, Trash2, Power, Calendar } from 'lucide-react'
import { OPTIONS_CATALOG, PRICING_PERIODS, BOAT_PRICES, BOATS } from '@/lib/mock-data'
import { SectionLabel } from '@/components/ui'
import OptionIcon, { ICON_NAMES } from '@/components/ui/OptionIcon'

const UNITS = ['/ jour', '/ semaine', '/ jeu', '/ personne', 'forfait']

// ════════════════════════════════════════════════════════════════
// ONGLET OPTIONS
// ════════════════════════════════════════════════════════════════

function OptionFormModal({ option, onClose, onSave }) {
  const [form, setForm] = useState(option || {
    label: '', price: '', unit: 'forfait', icon: 'Anchor', hasSub: false, description: '', active: true,
  })
  const [errors, setErrors] = useState({})

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.label.trim()) e.label = 'Le nom est requis.'
    if (form.price === '' || isNaN(parseFloat(form.price))) e.price = 'Indique un prix valide.'
    setErrors(e)
    if (!Object.keys(e).length) {
      onSave({ ...form, price: parseFloat(form.price), id: option?.id || 'opt-' + Date.now() })
    }
  }

  const inp = (k) => `w-full text-sm px-3 py-2 border rounded-lg bg-white transition-colors ${errors[k] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'}`

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">{option ? 'Modifier l\'option' : 'Nouvelle option'}</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5">Nom de l'option <span className="text-danger-600">*</span></p>
            <input className={inp('label')} placeholder="ex: Climatisation" value={form.label} onChange={e => set('label', e.target.value)} />
            {errors.label && <p className="text-xs text-danger-600 mt-1">{errors.label}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Prix (€) <span className="text-danger-600">*</span></p>
              <input type="number" step="0.01" className={inp('price')} placeholder="25" value={form.price} onChange={e => set('price', e.target.value)} />
              {errors.price && <p className="text-xs text-danger-600 mt-1">{errors.price}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Unité</p>
              <select className={inp('unit')} value={form.unit} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5">Icône</p>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_NAMES.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${form.icon === icon ? 'border-navy-600 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => set('icon', icon)}
                >
                  <OptionIcon name={icon} size={15} style={{ color: form.icon === icon ? '#1B4F8A' : '#9ca3af' }} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5">Description (optionnel)</p>
            <textarea
              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-navy-600"
              rows={2}
              placeholder="Détail visible dans le formulaire de location"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer mb-1">
            <input type="checkbox" checked={form.hasSub} onChange={e => set('hasSub', e.target.checked)} className="w-3.5 h-3.5 rounded accent-navy-600" />
            <span className="text-xs text-gray-600">Nécessite une précision (quantité, type...)</span>
          </label>
          <p className="text-[10px] text-gray-400 ml-5">ex: nombre de jeux de draps, type de skipper...</p>
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary flex-1 justify-center" onClick={validate}>
            <Check size={14} /> {option ? 'Enregistrer' : 'Créer l\'option'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OptionRow({ option, onEdit, onToggle, onDelete }) {
  return (
    <div className={`card flex items-center gap-4 transition-opacity ${!option.active ? 'opacity-50' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
        <OptionIcon name={option.icon} size={18} style={{ color: '#1B4F8A' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{option.label}</p>
          {option.hasSub && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Avec précision</span>}
          {!option.active && <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Désactivée</span>}
        </div>
        {option.description && <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-display text-base font-bold text-navy-600">{option.price}€</p>
        <p className="text-[10px] text-gray-400">{option.unit}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => onToggle(option)} title={option.active ? 'Désactiver' : 'Activer'}>
          <Power size={14} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => onEdit(option)} title="Modifier">
          <Pencil size={14} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-danger-50 text-gray-400 hover:text-danger-600" onClick={() => onDelete(option)} title="Supprimer">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function OptionsTab() {
  const [options, setOptions] = useState(OPTIONS_CATALOG)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const activeCount = options.filter(o => o.active).length

  function handleSave(option) {
    setOptions(prev => {
      const exists = prev.some(o => o.id === option.id)
      return exists ? prev.map(o => o.id === option.id ? option : o) : [...prev, option]
    })
    setEditing(null)
  }

  function toggleActive(option) {
    setOptions(prev => prev.map(o => o.id === option.id ? { ...o, active: !o.active } : o))
  }

  function confirmDelete() {
    setOptions(prev => prev.filter(o => o.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">{activeCount} option{activeCount > 1 ? 's' : ''} active{activeCount > 1 ? 's' : ''} sur {options.length}</p>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Nouvelle option</button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Ces options et leurs prix apparaissent dans le formulaire de nouvelle location. Désactive une option pour la masquer sans la supprimer.
      </p>
      <div className="flex flex-col gap-3">
        {options.map(opt => (
          <OptionRow key={opt.id} option={opt} onEdit={setEditing} onToggle={toggleActive} onDelete={setDeleteTarget} />
        ))}
      </div>

      {editing && (
        <OptionFormModal
          option={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-sm font-medium mb-1">Supprimer "{deleteTarget.label}" ?</p>
            <p className="text-xs text-gray-400 mb-5">Cette option ne sera plus disponible dans le formulaire de nouvelle location.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setDeleteTarget(null)}>Annuler</button>
              <button className="btn-primary flex-1 justify-center bg-danger-600 hover:bg-danger-800" onClick={confirmDelete}>
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ONGLET TARIFS BATEAUX
// ════════════════════════════════════════════════════════════════

function PeriodFormModal({ period, onClose, onSave }) {
  const [form, setForm] = useState(period || { label: '', start: '', end: '', color: '#1B4F8A', rhythm: 'free' })
  const [errors, setErrors] = useState({})

  const COLORS = ['#1B4F8A', '#0F7D57', '#B36A0A', '#B02020', '#3C3489']

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.label.trim()) e.label = 'Le nom est requis.'
    if (!form.start) e.start = 'Date de début requise.'
    if (!form.end) e.end = 'Date de fin requise.'
    else if (form.end <= form.start) e.end = 'Doit être après la date de début.'
    setErrors(e)
    if (!Object.keys(e).length) {
      onSave({ ...form, id: period?.id || 'period-' + Date.now() })
    }
  }

  const inp = (k) => `w-full text-sm px-3 py-2 border rounded-lg bg-white transition-colors ${errors[k] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'}`

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">{period ? 'Modifier la période' : 'Nouvelle période'}</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-400 mb-1.5">Nom de la période <span className="text-danger-600">*</span></p>
          <input className={inp('label')} placeholder="ex: Vacances de printemps" value={form.label} onChange={e => set('label', e.target.value)} />
          {errors.label && <p className="text-xs text-danger-600 mt-1 mb-2">{errors.label}</p>}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Du <span className="text-danger-600">*</span></p>
              <input type="date" className={inp('start')} value={form.start} onChange={e => set('start', e.target.value)} />
              {errors.start && <p className="text-xs text-danger-600 mt-1">{errors.start}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Au <span className="text-danger-600">*</span></p>
              <input type="date" className={inp('end')} value={form.end} onChange={e => set('end', e.target.value)} />
              {errors.end && <p className="text-xs text-danger-600 mt-1">{errors.end}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-1.5 mt-3">Couleur repère</p>
          <div className="flex gap-2 mb-3">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                style={{ background: c, transform: form.color === c ? 'scale(1.15)' : 'scale(1)', boxShadow: form.color === c ? '0 0 0 2px white, 0 0 0 3.5px ' + c : 'none' }}
                onClick={() => set('color', c)}
              />
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-1.5">Rythme de location</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'free', label: 'Libre', sub: 'N\'importe quelle durée et date de départ' },
              { id: 'weekly-sat', label: 'Hebdomadaire — Samedi à vendredi', sub: 'Verrouillé sur des semaines complètes, rotation le samedi' },
            ].map(r => (
              <div
                key={r.id}
                className={`border rounded-xl p-2.5 cursor-pointer transition-all ${form.rhythm === r.id ? 'border-navy-600 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => set('rhythm', r.id)}
              >
                <p className={`text-xs font-medium ${form.rhythm === r.id ? 'text-navy-800' : ''}`}>{r.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary flex-1 justify-center" onClick={validate}>
            <Check size={14} /> {period ? 'Enregistrer' : 'Créer la période'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PricingTab({ activeBrand }) {
  const [periods, setPeriods] = useState(PRICING_PERIODS)
  const [prices, setPrices] = useState(BOAT_PRICES)
  const [editingPeriod, setEditingPeriod] = useState(null)
  const [deletePeriodTarget, setDeletePeriodTarget] = useState(null)
  const [editingCell, setEditingCell] = useState(null) // { boatId, periodId }
  const [cellValue, setCellValue] = useState('')

  const boats = BOATS.filter(b => b.brand === activeBrand)

  function savePeriod(period) {
    setPeriods(prev => {
      const exists = prev.some(p => p.id === period.id)
      return exists ? prev.map(p => p.id === period.id ? period : p) : [...prev, period].sort((a, b) => a.start.localeCompare(b.start))
    })
    setEditingPeriod(null)
  }

  function confirmDeletePeriod() {
    setPeriods(prev => prev.filter(p => p.id !== deletePeriodTarget.id))
    setPrices(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(boatId => {
        const boatPrices = { ...next[boatId] }
        delete boatPrices[deletePeriodTarget.id]
        next[boatId] = boatPrices
      })
      return next
    })
    setDeletePeriodTarget(null)
  }

  function startEditCell(boatId, periodId) {
    setEditingCell({ boatId, periodId })
    setCellValue(String(prices[boatId]?.[periodId] || ''))
  }

  function saveCell() {
    const val = parseFloat(cellValue)
    if (!isNaN(val) && editingCell) {
      setPrices(prev => ({
        ...prev,
        [editingCell.boatId]: { ...prev[editingCell.boatId], [editingCell.periodId]: val },
      }))
    }
    setEditingCell(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-400">Prix de location par semaine, par bateau et par période</p>
        <button className="btn-primary" onClick={() => setEditingPeriod({})}><Plus size={14} /> Nouvelle période</button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Ces tarifs sont proposés automatiquement à la création d'une location selon les dates choisies. L'agence peut toujours les modifier manuellement.
      </p>

      {/* Liste des périodes */}
      <SectionLabel>Périodes tarifaires</SectionLabel>
      <div className="flex flex-wrap gap-2 mb-5">
        {periods.map(p => (
          <div key={p.id} className="flex items-center gap-2 rounded-full pl-1 pr-1 py-1 border border-gray-200 bg-white">
            <div className="flex items-center gap-1.5 pl-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-xs font-medium">{p.label}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(p.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(p.end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
              {p.rhythm === 'weekly-sat' && <span className="text-[10px] bg-navy-50 text-navy-600 px-1.5 py-0.5 rounded-full">Sam→Ven</span>}
            </div>
            <button className="p-1 rounded-full hover:bg-gray-100 text-gray-400" onClick={() => setEditingPeriod(p)}><Pencil size={11} /></button>
            <button className="p-1 rounded-full hover:bg-danger-50 text-gray-400 hover:text-danger-600" onClick={() => setDeletePeriodTarget(p)}><Trash2 size={11} /></button>
          </div>
        ))}
        {periods.length === 0 && <p className="text-xs text-gray-400 italic">Aucune période définie — créez-en une pour commencer.</p>}
      </div>

      {/* Grille de prix */}
      <SectionLabel>Grille tarifaire</SectionLabel>
      <div className="card overflow-auto p-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">Bateau</th>
              {periods.map(p => (
                <th key={p.id} className="text-center px-3 py-2.5 text-xs font-medium" style={{ color: p.color }}>
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    {p.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boats.map(boat => (
              <tr key={boat.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-xs font-medium sticky left-0 bg-white">{boat.name.split('—')[0].split('·')[0].trim()}</td>
                {periods.map(p => {
                  const isEditing = editingCell?.boatId === boat.id && editingCell?.periodId === p.id
                  const val = prices[boat.id]?.[p.id]
                  return (
                    <td key={p.id} className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          className="w-20 text-xs text-center border border-navy-300 rounded px-1.5 py-1"
                          value={cellValue}
                          onChange={e => setCellValue(e.target.value)}
                          onBlur={saveCell}
                          onKeyDown={e => e.key === 'Enter' && saveCell()}
                        />
                      ) : (
                        <button
                          className="text-xs font-medium text-navy-700 hover:bg-navy-50 px-2 py-1 rounded-lg transition-colors"
                          onClick={() => startEditCell(boat.id, p.id)}
                        >
                          {val ? `${val}€` : <span className="text-gray-300">—</span>}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPeriod && (
        <PeriodFormModal
          period={editingPeriod.id ? editingPeriod : null}
          onClose={() => setEditingPeriod(null)}
          onSave={savePeriod}
        />
      )}

      {deletePeriodTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-sm font-medium mb-1">Supprimer "{deletePeriodTarget.label}" ?</p>
            <p className="text-xs text-gray-400 mb-5">Les prix associés à cette période seront aussi supprimés.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setDeletePeriodTarget(null)}>Annuler</button>
              <button className="btn-primary flex-1 justify-center bg-danger-600 hover:bg-danger-800" onClick={confirmDeletePeriod}>
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ════════════════════════════════════════════════════════════════

export default function Options() {
  const [tab, setTab] = useState('options')
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Options & tarifs</h1>
          <p className="text-xs text-gray-400">Catalogue d'options et grille tarifaire de la flotte</p>
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          {[{ id: 'options', label: 'Options' }, { id: 'pricing', label: 'Tarifs bateaux' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 text-xs font-medium transition-colors"
              style={{ background: tab === t.id ? '#1B4F8A' : '#fff', color: tab === t.id ? '#fff' : '#6b7280' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {tab === 'options' ? <OptionsTab /> : <PricingTab activeBrand={activeBrand} />}
      </div>
    </div>
  )
}
