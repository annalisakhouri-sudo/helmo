import { useState, useRef } from 'react'
import { Upload, Check, FileText, X } from 'lucide-react'

// Composant réutilisable d'upload de fichier (glisser-déposer ou sélection)
// onUpload(fileName) callback quand un fichier est "uploadé"
export default function FileUpload({ onUpload, currentFile, label = 'Glissez un fichier ici ou cliquez pour sélectionner' }) {
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState(currentFile || null)
  const [editing, setEditing] = useState(false)
  const [tempName, setTempName] = useState('')
  const inputRef = useRef()

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    onUpload && onUpload(file.name)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  function startRename() {
    setTempName(fileName || '')
    setEditing(true)
  }

  function saveRename() {
    if (tempName.trim()) {
      setFileName(tempName.trim())
      onUpload && onUpload(tempName.trim())
    }
    setEditing(false)
  }

  if (fileName) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border bg-teal-50 border-teal-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-white" />
          </div>
          {editing ? (
            <input
              autoFocus
              className="text-sm font-medium border border-teal-300 rounded px-2 py-1 bg-white"
              value={tempName}
              onChange={e => setTempName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={e => e.key === 'Enter' && saveRename()}
            />
          ) : (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-teal-600">Document uploadé</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="text-xs text-teal-700 hover:underline" onClick={startRename}>Renommer</button>
          <button className="text-xs text-teal-700 hover:underline" onClick={() => inputRef.current?.click()}>Remplacer</button>
        </div>
        <input ref={inputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${dragOver ? 'border-navy-400 bg-navy-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload size={20} className="text-gray-400" />
      <p className="text-xs text-gray-400 text-center">{label}</p>
      <input ref={inputRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}
