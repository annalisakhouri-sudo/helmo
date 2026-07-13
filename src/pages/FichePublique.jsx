import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { BOATS, DOC_LABELS } from '@/lib/mock-data'
import { Check, AlertTriangle, X, Anchor, Shield, FileText, Wrench } from 'lucide-react'

const DOC_ICONS = {
  francisation: FileText,
  assurance: Shield,
  securite: Anchor,
  jauge: FileText,
}

const EQUIPEMENTS = ['SUP x2', 'Annexe', 'Taud de soleil', 'Masque & tuba x3', 'Gilets de sauvetage', 'VHF à bord']

export default function FichePublique() {
  const { id } = useParams()
  const boat = BOATS.find(b => b.id === id)

  if (!boat) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-danger-50 flex items-center justify-center mx-auto mb-4">
          <X size={28} className="text-danger-400" />
        </div>
        <h1 className="font-display text-xl font-bold mb-2">Bateau introuvable</h1>
        <p className="text-sm text-gray-400">Ce QR code ne correspond à aucun bateau enregistré.</p>
      </div>
    </div>
  )

  const allDocsOk = Object.values(boat.docs).every(d => d.status === 'ok')
  const hasIssue = Object.values(boat.docs).some(d => d.status !== 'ok')
  const hasDanger = Object.values(boat.docs).some(d => d.status === 'danger')

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div className="bg-navy-900 px-5 py-5 text-center" style={{ background: '#042C53' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Hel<span style={{ color: '#5DCAA5' }}>mo</span>
        </p>
        <p style={{ color: '#85B7EB', fontSize: 11 }}>Fiche bateau — accès public</p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-6">

        {/* Identité bateau */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-navy-50 flex items-center justify-center mx-auto mb-3">
            <Anchor size={24} className="text-navy-600" style={{ color: '#185FA5' }} />
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{boat.name}</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{boat.type} · {boat.length}m · {boat.port}</p>

          {/* Statut global */}
          {allDocsOk ? (
            <div style={{ background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} color="#0F6E56" />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#085041' }}>Tous les documents sont à jour</span>
            </div>
          ) : hasDanger ? (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="#A32D2D" />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#791F1F' }}>Document(s) manquant(s) — contacter l'agence</span>
            </div>
          ) : (
            <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color="#854F0B" />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#633806' }}>Document(s) à renouveler bientôt</span>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 12 }}>Documents obligatoires</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(boat.docs).map(([key, doc]) => {
              const Icon = DOC_ICONS[key] || FileText
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: doc.status === 'ok' ? '#E1F5EE' : doc.status === 'warn' ? '#FAEEDA' : '#FCEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={doc.status === 'ok' ? '#0F6E56' : doc.status === 'warn' ? '#854F0B' : '#A32D2D'} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{DOC_LABELS[key]}</p>
                      {doc.expires && <p style={{ fontSize: 11, color: '#9ca3af' }}>Expire : {new Date(doc.expires).toLocaleDateString('fr-FR')}</p>}
                    </div>
                  </div>
                  {doc.status === 'ok' && (
                    <span style={{ background: '#E1F5EE', color: '#085041', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>✓ Valide</span>
                  )}
                  {doc.status === 'warn' && (
                    <span style={{ background: '#FAEEDA', color: '#633806', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>⚠ {doc.label}</span>
                  )}
                  {doc.status === 'danger' && (
                    <span style={{ background: '#FCEBEB', color: '#791F1F', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>✗ Manquant</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Équipements */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 12 }}>Équipements à bord</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EQUIPEMENTS.map(eq => (
              <span key={eq} style={{ background: '#EFF6FF', color: '#1e40af', fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '0.5px solid #BFDBFE' }}>{eq}</span>
            ))}
          </div>
        </div>

        {/* Contact agence */}
        {hasIssue && (
          <div style={{ background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#633806', marginBottom: 4 }}>⚠ Document(s) à vérifier</p>
            <p style={{ fontSize: 12, color: '#854F0B' }}>En cas de doute, contactez l'agence avant de prendre la mer.</p>
          </div>
        )}

        {/* Footer Helmo */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>Fiche générée par <strong style={{ color: '#185FA5' }}>Helmo</strong></p>
          <p style={{ fontSize: 10, color: '#d1d5db', marginTop: 2 }}>helmo.fr · La barre entre vos mains</p>
        </div>

      </div>
    </div>
  )
}
