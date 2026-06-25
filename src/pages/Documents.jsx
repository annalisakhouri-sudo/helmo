import { useState } from 'react'
import { Upload, QrCode, FileText, Shield, Anchor, AlertTriangle, Check, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { BOATS, DOC_LABELS } from '@/lib/mock-data'
import { Card, SectionLabel, Badge } from '@/components/ui'

const DOC_ICONS = { francisation: FileText, assurance: Shield, securite: Anchor, jauge: Anchor }

function DocStatusBadge({ status, label }) {
  if (status === 'ok') return <span className="pill-ok"><Check size={10} /> {label}</span>
  if (status === 'warn') return <span className="pill-warn"><AlertTriangle size={10} /> {label}</span>
  return <span className="pill-danger"><X size={10} /> {label}</span>
}

function BoatDocCard({ boat, onQr }) {
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
            ? <span className="pill-danger">1 doc manquant</span>
            : hasIssue
            ? <span className="pill-warn">Expire bientôt</span>
            : <span className="pill-ok">Tout à jour</span>
          }
          {hasDanger
            ? <button className="btn-danger py-1 px-2.5 text-xs" disabled>QR désactivé</button>
            : <button className="btn-ghost py-1 px-2.5 text-xs" onClick={() => onQr(boat)}>
                <QrCode size={12} /> QR code
              </button>
          }
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Object.entries(boat.docs).map(([key, doc]) => {
          const Icon = DOC_ICONS[key] || FileText
          return (
            <div key={key} className={`rounded-lg p-2.5 cursor-pointer hover:opacity-80 transition-opacity ${
              doc.status === 'ok' ? 'bg-gray-50' :
              doc.status === 'warn' ? 'bg-amber-50 border border-amber-100' :
              'bg-danger-50 border border-danger-100'
            }`}>
              <p className="text-[10px] text-gray-400 mb-1">{DOC_LABELS[key]}</p>
              <DocStatusBadge status={doc.status} label={doc.label} />
              {doc.status !== 'ok' && (
                <p className="text-[10px] text-navy-600 mt-1.5 cursor-pointer">Mettre à jour →</p>
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
  const [qrBoat, setQrBoat] = useState(null)
  const alerts = BOATS.flatMap(b =>
    Object.entries(b.docs)
      .filter(([_, d]) => d.status !== 'ok')
      .map(([key, d]) => ({ boat: b.name, key, doc: d }))
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Documents de la flotte</h1>
          <p className="text-xs text-gray-400">{BOATS.length} bateaux · {alerts.length} alertes</p>
        </div>
        <button className="btn-primary"><Upload size={14} /> Uploader un document</button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {alerts.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Alertes actives</SectionLabel>
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2.5 rounded-lg p-2.5 border text-sm ${
                  a.doc.status === 'danger' ? 'bg-danger-50 border-danger-100 text-danger-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}>
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span className="flex-1"><strong>{a.boat}</strong> — {DOC_LABELS[a.key]} : {a.doc.label}</span>
                  <button className="text-xs underline cursor-pointer">Mettre à jour</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <SectionLabel>Flotte complète</SectionLabel>
        <div className="flex flex-col gap-3">
          {BOATS.map(boat => (
            <BoatDocCard key={boat.id} boat={boat} onQr={setQrBoat} />
          ))}
        </div>
      </div>

      {qrBoat && <QrModal boat={qrBoat} onClose={() => setQrBoat(null)} />}
    </div>
  )
}
