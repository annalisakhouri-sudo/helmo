import { useState } from 'react'
import React from 'react'
import { X, FileText, Shield, Anchor, Users, Shirt, Phone, User, ClipboardCheck, CircleCheck, Tag, AlertTriangle } from 'lucide-react'
import { TECHNICIANS, BOATS, OPTIONS_CATALOG } from '@/lib/mock-data'
import { Card, SectionLabel, ProgressBar } from '@/components/ui'
import CheckIn from './CheckIn'
import ContractModal from './ContractModal'
import { getState, subscribe, completeCheckIn, getMaintenanceTasks } from '@/lib/shared-state'
import { buildChecklist } from './MaintenanceModal'

const DOC_ICONS = { francisation: FileText, assurance: Shield, securite: Anchor, jauge: Anchor }
const DOC_NAMES = { francisation: 'Francisation', assurance: 'Assurance', securite: 'Carnet sécurité', jauge: 'Jauge' }

export default function BookingDetail({ booking, context = 'depart', onClose, onFindSkipper, onViewDocs, onViewClientDocs, onViewClient, onBookingChange }) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  const techs = TECHNICIANS.filter(t => t.assignedBoats.includes(booking.boatId))
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showContract, setShowContract] = useState(false)
  const [sharedState, setSharedState] = useState(getState())
  const [, forceUpdate] = useState(0) // force le re-render local après mutation directe de booking
  
  React.useEffect(() => {
    return subscribe(state => setSharedState(state))
  }, [])
  const checkInDone = !!sharedState.checkIns[booking.id]?.done

  function setClientAsSkipper() {
    booking.skipperName = booking.client
    booking.clientIsSkipper = true
    booking.skipperInitials = booking.client.split(' ').map(n => n[0]).join('').slice(0, 2)
    forceUpdate(v => v + 1) // re-render la fiche elle-même
    onBookingChange && onBookingChange(booking) // prévient le parent (dashboard/planning) que l'alerte doit disparaître
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

          <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="font-display text-white text-base font-bold">{booking.boatName} — {booking.client}</h2>
              <p className="text-navy-100 text-xs mt-0.5">{booking.start} → {booking.end}</p>
            </div>
            <div className="flex items-center gap-3">
              {checkInDone
                ? <span className="pill-ok flex items-center gap-1"><CircleCheck size={11} /> Check-in OK</span>
                : booking.status === 'confirmed' ? <span className="pill-ok">Confirmée</span>
                : booking.status === 'skipper-missing' ? <span className="pill-warn">Skipper manquant</span>
                : <span className="pill-danger">Doc manquant</span>
              }
              <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-5">

            {/* Colonne gauche */}
            <div className="flex flex-col gap-4">
              <div>
                <SectionLabel>Infos client</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div className="card-sm cursor-pointer hover:bg-gray-100 transition-colors" onClick={onViewClient}>
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

              {booking.options && Object.entries(booking.options).some(([, v]) => v) && (
                <div>
                  <SectionLabel>Options réservées</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(booking.options).filter(([, v]) => v).map(([optId, val]) => {
                      const opt = OPTIONS_CATALOG.find(o => o.id === optId)
                      if (!opt) return null
                      const qty = typeof val === 'object' ? val.qty : null
                      return (
                        <div key={optId} className="card-sm">
                          <div className="flex items-center gap-1 mb-0.5"><Tag size={11} className="text-navy-600" /><span className="text-xs font-medium">{opt.label}</span></div>
                          {qty ? <p className="text-[10px] text-navy-600">× {qty}</p> : <p className="text-[10px] text-teal-600">Inclus</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <SectionLabel>Skipper</SectionLabel>
                {booking.skipperName ? (
                  <div className={`card-sm ${booking.clientIsSkipper ? 'border border-navy-100 bg-navy-50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${booking.clientIsSkipper ? 'bg-navy-100 text-navy-800' : 'bg-navy-100 text-navy-800'}`}>
                        {booking.skipperInitials || booking.skipperName.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{booking.skipperName}</p>
                        {booking.clientIsSkipper
                          ? <span className="text-[10px] text-navy-500">Client navigue lui-même</span>
                          : <p className="text-[10px] text-gray-400">{booking.phone}</p>
                        }
                      </div>
                      <span className="text-[11px] text-navy-600 cursor-pointer" onClick={onFindSkipper}>Changer →</span>
                    </div>
                    {booking.clientIsSkipper && (
                      <button className="btn-ghost py-1.5 px-3 text-xs w-full justify-center border-amber-300 text-amber-800 mt-2.5" onClick={onViewClientDocs}>
                        <Users size={12} /> Compléter les documents du client
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="card-sm border border-dashed border-amber-200">
                    <p className="text-xs text-amber-800 mb-2">Aucun skipper assigné</p>
                    <div className="flex gap-2">
                      <button className="btn-primary py-1.5 px-3 text-xs flex-1 justify-center" onClick={onFindSkipper}>
                        <Users size={12} /> Trouver un skipper
                      </button>
                      <button className="btn-ghost py-1.5 px-3 text-xs flex-1 justify-center" onClick={setClientAsSkipper}>
                        Client navigue seul
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contrat de location */}
              <div>
                <SectionLabel>Contrat</SectionLabel>
                {(() => {
                  const contractState = sharedState.contracts[booking.id]
                  const status = contractState?.status || 'brouillon'
                  const daysSinceSent = status === 'envoye' && contractState.sentAt ? Math.floor((new Date('2026-07-04') - new Date(contractState.sentAt)) / (1000 * 60 * 60 * 24)) : 0
                  const overdue = status === 'envoye' && daysSinceSent >= 7
                  const style = status === 'signe' ? 'bg-teal-50 border-teal-100 hover:bg-teal-100'
                    : overdue ? 'bg-amber-50 border-amber-100 hover:bg-amber-100'
                    : status === 'envoye' ? 'bg-navy-50 border-navy-100 hover:bg-navy-100'
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                  const iconColor = status === 'signe' ? 'text-teal-600' : overdue ? 'text-amber-600' : status === 'envoye' ? 'text-navy-600' : 'text-gray-400'
                  const titleColor = status === 'signe' ? 'text-teal-800' : overdue ? 'text-amber-800' : status === 'envoye' ? 'text-navy-800' : 'text-gray-700'
                  const subColor = status === 'signe' ? 'text-teal-600' : overdue ? 'text-amber-700' : status === 'envoye' ? 'text-navy-600' : 'text-gray-400'
                  const title = status === 'signe' ? 'Contrat signé reçu'
                    : overdue ? `Envoyé il y a ${daysSinceSent} jours — pas de retour`
                    : status === 'envoye' ? 'Contrat envoyé au client'
                    : 'Contrat en brouillon'
                  const subtitle = status === 'signe' ? `Reçu le ${contractState.signedAt} · dans les documents`
                    : status === 'envoye' ? `Envoyé le ${contractState.sentAt} · en attente de signature`
                    : 'Cliquer pour voir, modifier et envoyer'
                  return (
                    <div
                      className={`flex items-center gap-2.5 rounded-xl p-3 border cursor-pointer transition-colors ${style}`}
                      onClick={() => setShowContract(true)}
                    >
                      {overdue ? <AlertTriangle size={18} className={`${iconColor} flex-shrink-0`} /> : <FileText size={18} className={`${iconColor} flex-shrink-0`} />}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${titleColor}`}>{title}</p>
                        <p className={`text-xs ${subColor}`}>{subtitle}</p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Check-in (toujours visible, quel que soit le contexte) */}
              <div>
                <SectionLabel>Check-in {context === 'retour' && '(départ)'}</SectionLabel>
                {checkInDone ? (
                  <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-100 rounded-xl p-3">
                    <CircleCheck size={18} className="text-teal-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-teal-800">Check-in complété</p>
                      <p className="text-xs text-teal-600">Signé par {booking.client} · PDF enregistré</p>
                    </div>
                  </div>
                ) : (
                  <button className="btn-primary w-full justify-center py-2.5" onClick={() => setShowCheckIn(true)}>
                    <ClipboardCheck size={15} /> Démarrer le check-in
                  </button>
                )}
              </div>

              {/* Check-out (lecture seule, uniquement pertinent en contexte retour) */}
              {context === 'retour' && (
                <div>
                  <SectionLabel>Check-out (retour)</SectionLabel>
                  {(() => {
                    const ALL_ITEMS = buildChecklist(boat, booking).flatMap(c => c.items)
                    const stored = getMaintenanceTasks(booking.id, ALL_ITEMS.map(i => ({ id: i.id, qty: i.max, max: i.max })), [])
                    const anomalyDetails = stored.anomalyDetails || {}
                    const missingItems = ALL_ITEMS.filter(i => {
                      const item = stored.arrival.find(t => t.id === i.id)
                      return item && item.qty < i.max && !anomalyDetails[i.id]?.dismissed
                    })
                    const okCount = ALL_ITEMS.length - missingItems.length
                    const pct = Math.round((okCount / ALL_ITEMS.length) * 100)
                    const started = stored.arrival.some(t => t.qty !== ALL_ITEMS.find(i => i.id === t.id)?.max)
                    if (!started) {
                      return (
                        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3">
                          <ClipboardCheck size={18} className="text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">Check-out non commencé</p>
                            <p className="text-xs text-gray-400">À effectuer par le technicien au retour du bateau</p>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className={`flex items-center gap-2.5 rounded-xl p-3 border ${missingItems.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-teal-50 border-teal-100'}`}>
                        <CircleCheck size={18} className={missingItems.length > 0 ? 'text-amber-600' : 'text-teal-600'} />
                        <div>
                          <p className={`text-sm font-medium ${missingItems.length > 0 ? 'text-amber-800' : 'text-teal-800'}`}>Check-out {pct}% effectué</p>
                          <p className={`text-xs ${missingItems.length > 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                            {missingItems.length > 0 ? `${missingItems.length} écart${missingItems.length > 1 ? 's' : ''} signalé${missingItems.length > 1 ? 's' : ''}` : 'Aucun écart signalé'}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div className="flex flex-col gap-4">
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

      {showCheckIn && (
        <CheckIn
          booking={booking}
          onClose={() => setShowCheckIn(false)}
          onComplete={() => { setShowCheckIn(false) }}
        />
      )}

      {showContract && (
        <ContractModal booking={booking} onClose={() => setShowContract(false)} />
      )}
    </>
  )
}
