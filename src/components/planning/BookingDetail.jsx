import { X, FileText, Shield, Anchor, Users, Shirt, Phone, User } from 'lucide-react'
import { TECHNICIANS, BOATS } from '@/lib/mock-data'
import { Card, SectionLabel, ProgressBar } from '@/components/ui'

const DOC_ICONS = { francisation: FileText, assurance: Shield, securite: Anchor, jauge: Anchor }
const DOC_NAMES = { francisation: 'Francisation', assurance: 'Assurance', securite: 'Carnet sécurité', jauge: 'Jauge' }

export default function BookingDetail({ booking, onClose, onFindSkipper, onViewDocs }) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  const techs = TECHNICIANS.filter(t => t.assignedBoats.includes(booking.boatId))

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-white text-base font-bold">{booking.boatName} — {booking.client}</h2>
            <p className="text-navy-100 text-xs mt-0.5">{booking.start} → {booking.end}</p>
          </div>
          <div className="flex items-center gap-3">
            {booking.status === 'confirmed' && <span className="pill-ok">Confirmée</span>}
            {booking.status === 'skipper-missing' && <span className="pill-warn">Skipper manquant</span>}
            {booking.status === 'doc-issue' && <span className="pill-danger">Doc manquant</span>}
            <button onClick={onClose} className="text-navy-100 hover:text-white transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-5">

          {/* Colonne gauche */}
          <div className="flex flex-col gap-4">
            {/* Infos client */}
            <div>
              <SectionLabel>Client & bateau</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <div className="card-sm cursor-pointer hover:bg-gray-100 transition-colors">
                  <p className="text-[10px] text-gray-400 mb-1">Client</p>
                  <div className="flex items-center gap-1.5"><User size={12} className="text-navy-600" /><span className="text-xs font-medium">{booking.client}</span></div>
                  <p className="text-[10px] text-navy-600 mt-1">Voir fiche →</p>
                </div>
                <div className="card-sm">
                  <p className="text-[10px] text-gray-400 mb-1">Téléphone</p>
                  <div className="flex items-center gap-1.5"><Phone size={12} className="text-navy-600" /><span className="text-xs font-medium">{booking.phone}</span></div>
                </div>
                <div className="card-sm cursor-pointer hover:bg-gray-100 transition-colors" onClick={onViewDocs}>
                  <p className="text-[10px] text-gray-400 mb-1">Bateau</p>
                  <div className="flex items-center gap-1.5"><Anchor size={12} className="text-navy-600" /><span className="text-xs font-medium">{booking.boatName}</span></div>
                  <p className="text-[10px] text-navy-600 mt-1">Voir docs →</p>
                </div>
                <div className="card-sm">
                  <p className="text-[10px] text-gray-400 mb-1">À bord</p>
                  <div className="flex items-center gap-1.5"><Users size={12} className="text-navy-600" /><span className="text-xs font-medium">{booking.guests}</span></div>
                </div>
              </div>
            </div>

            {/* Draps */}
            {booking.draps?.length > 0 && (
              <div>
                <SectionLabel>Draps commandés</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {booking.draps.map((d, i) => (
                    <div key={i} className="card-sm">
                      <div className="flex items-center gap-1 mb-0.5"><Shirt size={11} className="text-teal-600" /><span className="text-xs font-medium">{d.name}</span></div>
                      <p className="text-[10px] text-navy-600">× {d.qty} {d.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipper */}
            <div>
              <SectionLabel>Skipper</SectionLabel>
              {booking.skipperName ? (
                <div className="card-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-navy-100 text-navy-800 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {booking.skipperInitials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{booking.skipperName}</p>
                    <p className="text-[10px] text-gray-400">{booking.phone}</p>
                  </div>
                  <button className="text-[11px] text-navy-600 cursor-pointer" onClick={onFindSkipper}>Changer →</button>
                </div>
              ) : (
                <div className="card-sm border border-dashed border-amber-200">
                  <p className="text-xs text-amber-800 mb-2">Aucun skipper assigné</p>
                  <button className="btn-primary py-1.5 px-3 text-xs w-full justify-center" onClick={onFindSkipper}>
                    <Users size={12} /> Trouver un skipper
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-4">
            {/* Documents bateau */}
            {boat && (
              <div>
                <SectionLabel>Documents bateau</SectionLabel>
                <Card className="py-1 px-3">
                  {Object.entries(boat.docs).map(([key, doc]) => {
                    const Icon = DOC_ICONS[key] || FileText
                    return (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-3 px-3 transition-colors" onClick={onViewDocs}>
                        <div className="flex items-center gap-2 text-xs text-gray-600"><Icon size={13} className="text-gray-400" />{DOC_NAMES[key]}</div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'ok' && <span className="pill-ok">{doc.label}</span>}
                          {doc.status === 'warn' && <span className="pill-warn">{doc.label}</span>}
                          {doc.status === 'danger' && <span className="pill-danger">{doc.label}</span>}
                          <span className="text-gray-300 text-xs">›</span>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              </div>
            )}

            {/* Techniciens */}
            <div>
              <SectionLabel>Techniciens — samedi matin</SectionLabel>
              {techs.length > 0 ? techs.map(tech => {
                const tasks = tech.tasks[booking.boatId] || []
                const done = tasks.filter(t => t.done).length
                const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0
                return (
                  <div key={tech.id} className="card-sm mb-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium">{tech.name}</span>
                      <span className={`text-xs font-medium ${pct === 100 ? 'text-teal-600' : pct > 50 ? 'text-amber-600' : 'text-danger-600'}`}>{pct}%</span>
                    </div>
                    <ProgressBar pct={pct} variant={pct === 100 ? 'ok' : pct > 50 ? 'warn' : 'danger'} />
                    <div className="mt-2 flex flex-col gap-1">
                      {tasks.map(task => (
                        <div key={task.id} className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${task.done ? 'bg-teal-50 text-teal-800' : task.alert ? 'bg-danger-50 text-danger-800 font-medium' : 'bg-gray-50 text-gray-500'}`}>
                          <span>{task.done ? '✓' : task.alert ? '⚠' : '○'}</span>
                          {task.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }) : (
                <div className="card-sm border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400">Aucun technicien assigné</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
