import { useState } from 'react'
import { X, Check, AlertTriangle } from 'lucide-react'
import FileUpload from './FileUpload'

// Modale générique pour mettre à jour un document manquant ou qui expire
// La date de péremption est obligatoire, sauf si "Pas de date d'expiration" est coché.
export default function DocUpdateModal({ title, subtitle, docLabel, currentExpiry, onClose, onSave }) {
  const [fileName, setFileName] = useState(null)
  const [expiry, setExpiry] = useState(currentExpiry || '')
  const [noExpiry, setNoExpiry] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function confirm() {
    if (!noExpiry && !expiry) {
      setError("Indiquez la date d'expiration, ou cochez \"Pas de date d'expiration\".")
      return
    }
    onSave && onSave({ fileName, expiry: noExpiry ? null : expiry, noExpiry })
    setSaved(true)
    setTimeout(() => onClose(), 900)
  }

  if (saved) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 text-center">
        <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
          <Check size={26} className="text-teal-400" />
        </div>
        <p className="font-medium text-sm">Document mis à jour !</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{docLabel}</h2>
            <p className="text-navy-100 text-xs">{title}{subtitle ? ` · ${subtitle}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-2">Document</p>
          <FileUpload onUpload={setFileName} currentFile={fileName} />

          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1.5 mt-4">
            Date d'expiration <span className="text-danger-600">*</span>
          </p>
          <input
            type="date"
            disabled={noExpiry}
            className={`w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:border-navy-600 transition-colors ${noExpiry ? 'bg-gray-50 text-gray-300' : 'border-gray-200'}`}
            value={expiry}
            onChange={e => { setExpiry(e.target.value); setError('') }}
          />

          <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={noExpiry}
              onChange={e => { setNoExpiry(e.target.checked); setError('') }}
              className="w-3.5 h-3.5 rounded accent-navy-600"
            />
            <span className="text-xs text-gray-500">Pas de date d'expiration pour ce document</span>
          </label>

          {error && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <AlertTriangle size={11} className="text-danger-600 flex-shrink-0" />
              <p className="text-xs text-danger-600">{error}</p>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className={`btn-primary flex-1 justify-center ${!fileName ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!fileName} onClick={confirm}>
            <Check size={14} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
