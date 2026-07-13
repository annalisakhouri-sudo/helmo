import { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Upload, QrCode, FileText, Shield, Anchor, AlertTriangle, Check, X, ChevronRight } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { BOATS, DOC_LABELS } from '@/lib/mock-data'
import { Card, SectionLabel } from '@/components/ui'
import DocUpdateModal from '@/components/ui/DocUpdateModal'

const DOC_ICONS = { francisation: FileText, assurance: Shield, securite: Anchor, jauge: Anchor }

function DocStatusBadge({ status, label }) {
  if (status === 'ok') return <span className="pill-ok"><Check size={10} /> {label}</span>
  if (status === 'warn') return <span className="pill-warn"><AlertTriangle size={10} /> {label}</span>
  return <span className="pill-danger"><X size={10} /> {label}</span>
}

function BoatDocCard({ boat, onQr, onUpdateDoc }) {
  const hasIssue = Object.values(boat.docs).some(d => d.status !== 'ok')
  const hasDanger = Object.values(boat.docs).some(d => d.status === 'danger')

  return (
    <Card className={hasDanger ? 'border-danger-100' : hasIssue ? 'border-amber-100' : ''}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
            <Anchor size={15} className="text-navy-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{boat.name}</p>
            <p className="text-xs text-gray-400">{boat.type} · {boat.length}m</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDanger
            ? <span className="pill-danger">Doc manquant</span>
            : hasIssue
            ? <span className="pill-warn">Expire bientôt</span>
            : <span className="pill-ok">Tout à jour</span>
          }
          {hasDanger
            ? <button className="btn-ghost py-1 px-2.5 text-xs opacity-50 cursor-not-allowed" disabled title="QR désactivé tant que le doc manque">QR désactivé</button>
            : <button className="btn-ghost py-1 px-2.5 text-xs" onClick={() => onQr(boat)}>
                <QrCode size={12} /> QR code
              </button>
          }
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Object.entries(boat.docs).map(([key, doc]) => {
          const Icon = DOC_ICONS[key] || FileText
          const clickable = doc.status !== 'ok'
          return (
            <div
              key={key}
              className={`rounded-lg p-2.5 transition-opacity ${clickable ? 'cursor-pointer hover:opacity-80' : ''} ${
                doc.status === 'ok' ? 'bg-gray-50' :
                doc.status === 'warn' ? 'bg-amber-50 border border-amber-100' :
                'bg-danger-50 border border-danger-100'
              }`}
              onClick={() => clickable && onUpdateDoc(boat, key, doc)}
            >
              <p className="text-[10px] text-gray-400 mb-1">{DOC_LABELS[key]}</p>
              <DocStatusBadge status={doc.status} label={doc.label} />
              {clickable && (
                <p className="text-[10px] text-navy-600 mt-1.5">Mettre à jour →</p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function QrModal({ boat, onClose }) {
  const url = `https://helmo.fr/bateau/${boat.id}`
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-80 p-6 flex flex-col items-center">
        <h3 className="font-display font-bold text-base mb-1">{boat.name}</h3>
        <p className="text-xs text-gray-400 mb-4">QR code à imprimer et coller dans le bateau</p>
        <div className="border border-gray-100 rounded-xl p-4 mb-4">
          <QRCodeSVG value={url} size={160} fgColor="#042C53" />
        </div>
        <p className="text-xs text-gray-400 mb-4">{url}</p>
        <div className="flex gap-2 w-full">
          <button className="btn-primary flex-1 justify-center" onClick={() => window.print()}>
            <Upload size={13} /> Télécharger
          </button>
          <button className="btn-ghost flex-1 justify-center" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function Documents() {
  const navigate = useNavigate()
  const [qrBoat, setQrBoat] = useState(null)
  const [updateTarget, setUpdateTarget] = useState(null) // { boat, key, doc }
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }
  const filteredBoats = BOATS.filter(b => b.brand === activeBrand)
  const alerts = filteredBoats.flatMap(b =>
    Object.entries(b.docs)
      .filter(([_, d]) => d.status !== 'ok')
      .map(([key, d]) => ({ boat: b, key, doc: d }))
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Documents de la flotte</h1>
          <p className="text-xs text-gray-400">{filteredBoats.length} bateaux · {alerts.length === 0 ? 'tout est à jour' : `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {alerts.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Alertes actives</SectionLabel>
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2.5 rounded-lg p-2.5 border text-sm cursor-pointer transition-colors ${
                  a.doc.status === 'danger' ? 'bg-danger-50 border-danger-100 text-danger-800 hover:bg-danger-100' : 'bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100'
                }`} onClick={() => setUpdateTarget(a)}>
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span className="flex-1"><strong>{a.boat.name}</strong> — {DOC_LABELS[a.key]} : {a.doc.label}</span>
                  <span className="text-xs underline">Mettre à jour →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <SectionLabel>Flotte complète</SectionLabel>
        <div className="flex flex-col gap-3">
          {filteredBoats.map(boat => (
            <BoatDocCard
              key={boat.id}
              boat={boat}
              onQr={setQrBoat}
              onUpdateDoc={(boat, key, doc) => setUpdateTarget({ boat, key, doc })}
            />
          ))}
        </div>
      </div>

      {qrBoat && <QrModal boat={qrBoat} onClose={() => setQrBoat(null)} />}

      {updateTarget && (
        <DocUpdateModal
          title={updateTarget.boat.name}
          docLabel={DOC_LABELS[updateTarget.key]}
          currentExpiry={updateTarget.doc.expires}
          onClose={() => setUpdateTarget(null)}
          onSave={() => {
            // En V2 : mise à jour réelle via Supabase
            updateTarget.doc.status = 'ok'
            updateTarget.doc.label = 'À jour'
          }}
        />
      )}
    </div>
  )
}
