import { useState, useEffect } from 'react'
import { Plus, X, Check, AlertTriangle, Bell, ChevronRight, MapPin, Calendar, Clock, UserCog } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TECHNICIANS } from '@/lib/mock-data'
import { getMissionsForTech } from '@/lib/tech-missions'
import { getState, subscribe, getTechTasks, toggleTask as sharedToggleTask, assignMission, resolveMissionRequest } from '@/lib/shared-state'
import { Card, SectionLabel } from '@/components/ui'

const BASES = [
  { id: 'base-1', name: 'Vieux-Port', port: 'Quai de la Criée — Marseille' },
  { id: 'base-2', name: 'Port Corbières', port: 'Port de Corbières — Marseille' },
]

// ── Construit les techniciens avec leurs vraies missions ──
// Source UNIQUE partagée avec l'app technicien (src/lib/tech-missions.js) : les deux
// affichent exactement les mêmes missions, et une réassignation faite ici se reflète
// immédiatement chez le technicien concerné.
function buildTechsFromBookings(extraTechs) {
  return [...TECHNICIANS, ...extraTechs].map(tech => {
    const missions = getMissionsForTech(tech.id).map(m => {
      const seedTasks = tech.tasks?.[m.boatId] // tâches spécifiques déjà présentes dans les données de démo, si dispo
      const defaultTasks = (seedTasks && seedTasks.length ? seedTasks : m.defaultTasks).map((t, i) => ({ id: `${m.key}-${i}`, label: t.label, done: t.done ?? false }))
      return { ...m, tasks: getTechTasks(tech.id, m.key, defaultTasks) }
    })
    return { id: tech.id, name: tech.name, phone: tech.phone, base: tech.base, planning: missions, notifications: [] }
  })
}

function PlanningTech({ tech, onClose, onToggleTask, onReassign }) {
  const [activeItem, setActiveItem] = useState(null)
  const unread = tech.notifications.filter(n => !n.read).length

  const TYPE_COLORS = {
    depart: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', badge: 'bg-teal-400', label: 'Départ' },
    retour: { bg: 'bg-navy-50', border: 'border-navy-200', text: 'text-navy-800', badge: 'bg-navy-400', label: 'Retour' },
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center text-white font-display font-bold">
              {tech.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="font-display text-white text-base font-bold">{tech.name}</h2>
              <div className="flex items-center gap-2">
                <MapPin size={10} className="text-navy-100" />
                <p className="text-navy-100 text-xs">{BASES.find(b => b.name === tech.base)?.name || tech.base || 'Base non assignée'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <div className="relative">
                <Bell size={18} className="text-navy-100" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger-400 flex items-center justify-center">
                  <span className="text-[9px] text-white font-medium">{unread}</span>
                </div>
              </div>
            )}
            <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">

          {/* Notifications */}
          {tech.notifications.filter(n => !n.read).length > 0 && (
            <div className="mb-4">
              <SectionLabel>Notifications</SectionLabel>
              {tech.notifications.filter(n => !n.read).map(n => (
                <div key={n.id} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3 mb-2">
                  <Bell size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-800">{n.msg}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Planning */}
          <SectionLabel>Planning — {tech.planning.length} mission{tech.planning.length > 1 ? 's' : ''}</SectionLabel>

          {tech.planning.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-400">Aucune mission assignée pour le moment.</p>
            </div>
          ) : (
            (() => {
              // Regroupement par semaine (Sam→Sam), dans l'ordre — le tableau est déjà trié.
              const groups = []
              tech.planning.forEach(item => {
                let g = groups[groups.length - 1]
                if (!g || g.weekStart !== item.weekStart) {
                  g = { weekStart: item.weekStart, items: [] }
                  groups.push(g)
                }
                g.items.push(item)
              })

              return (
                <div className="flex flex-col gap-5">
                  {groups.map(group => (
                    <div key={group.weekStart}>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Semaine du {format(parseISO(group.weekStart), 'd MMMM', { locale: fr })}
                      </p>
                      <div className="flex flex-col gap-3">
                        {group.items.map(item => {
                          const c = TYPE_COLORS[item.type]
                          const done = item.tasks.filter(t => t.done).length
                          const pct = Math.round((done / item.tasks.length) * 100)
                          const isActive = activeItem === item.id

                          return (
                            <div key={item.id} className={`border rounded-xl overflow-hidden transition-all ${c.border}`}>
                              <div
                                className={`flex items-center gap-3 p-3 cursor-pointer ${c.bg}`}
                                onClick={() => setActiveItem(isActive ? null : item.id)}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${c.badge}`}>
                                  {item.type === 'depart' ? '↗' : '↙'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium ${c.text}`}>{c.label} — {item.boat}</p>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.statut === 'en_cours' ? 'bg-amber-100 text-amber-700' : item.statut === 'termine' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                                      {item.statut === 'en_cours' ? 'En cours' : item.statut === 'termine' ? 'Terminé ✓' : 'À venir'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar size={10} className="text-gray-400" />
                                      <span className="text-[10px] text-gray-400">
                                        {item.moment || format(parseISO(item.date), 'EEE d MMM', { locale: fr })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock size={10} className="text-gray-400" />
                                      <span className="text-[10px] text-gray-400">{item.heure}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">{item.client}</span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-sm font-medium ${pct === 100 ? 'text-teal-600' : 'text-gray-500'}`}>{pct}%</p>
                                  <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-teal-400' : 'bg-amber-300'}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                                <ChevronRight size={14} className={`text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                              </div>

                              {isActive && (
                                <div className="border-t border-gray-100 p-3 bg-white">
                                  <div className="flex flex-col gap-1.5 mb-3">
                                    {item.tasks.map(task => (
                                      <div
                                        key={task.id}
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${task.done ? 'bg-teal-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                                        onClick={() => onToggleTask(tech.id, item.id, task.id)}
                                      >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${task.done ? 'bg-teal-400' : 'border border-gray-300'}`}>
                                          {task.done && <Check size={9} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${task.done ? 'text-teal-700 line-through opacity-60' : 'text-gray-700'}`}>{task.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <UserCog size={12} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-[10px] text-gray-400 flex-shrink-0">Réassigner à :</span>
                                    <select
                                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white flex-1"
                                      value={tech.id}
                                      onChange={e => onReassign(item.key, e.target.value)}
                                    >
                                      {[tech, ...TECHNICIANS.filter(t => t.id !== tech.id)].map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}

export default function Techniciens() {
  const [sharedState, setSharedState] = useState(getState())
  const [extraTechs, setExtraTechs] = useState([])
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBase, setNewBase] = useState(BASES[0].name)

  useEffect(() => subscribe(s => setSharedState(s)), [])

  const techs = buildTechsFromBookings(extraTechs)
  const openRequests = sharedState.missionRequests.filter(r => r.status === 'open')

  function toggleTask(techId, missionKey, taskId) {
    sharedToggleTask(techId, missionKey, taskId)
  }

  function reassign(missionKey, newTechId) {
    assignMission(missionKey, newTechId)
  }

  function addTech() {
    if (!newName.trim()) return
    setExtraTechs(prev => [...prev, {
      id: 'tech-' + Date.now(), name: newName, phone: newPhone, base: newBase,
      assignedBoats: [], tasks: {},
    }])
    setNewName(''); setNewPhone(''); setNewBase(BASES[0].name); setShowNew(false)
  }

  const selectedTech = techs.find(t => t.id === selected)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Techniciens</h1>
          <p className="text-xs text-gray-400">{techs.length} techniciens · {BASES.length} bases</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Ajouter</button>
      </div>

      <div className="flex-1 overflow-auto p-5">

        {/* Bases */}
        <SectionLabel>Bases</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {BASES.map(base => {
            const baseTechs = techs.filter(t => t.base === base.name)
            return (
              <Card key={base.id}>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-navy-600" />
                  <p className="text-sm font-medium">{base.name}</p>
                </div>
                <p className="text-xs text-gray-400 mb-2">{base.port}</p>
                <p className="text-xs text-navy-600">{baseTechs.length} technicien{baseTechs.length > 1 ? 's' : ''}</p>
              </Card>
            )
          })}
        </div>

        {/* Demandes en attente des techniciens (empêchement, échange...) */}
        {openRequests.length > 0 && (
          <div className="mb-5">
            <SectionLabel>Demandes en attente</SectionLabel>
            <div className="flex flex-col gap-2">
              {openRequests.map(req => {
                const mission = techs.flatMap(t => t.planning).find(m => m.key === req.missionKey)
                return (
                  <div key={req.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3 flex items-center gap-3">
                    <Bell size={14} className="text-amber-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-800">{req.techName} — {mission ? `${mission.boat} · ${mission.type === 'depart' ? 'Départ' : 'Retour'}` : 'Mission'}</p>
                      <p className="text-xs text-amber-700">{req.message}</p>
                    </div>
                    <select
                      className="text-xs border border-amber-200 rounded-lg px-2 py-1.5 bg-white flex-shrink-0"
                      defaultValue=""
                      onChange={e => {
                        if (!e.target.value) return
                        reassign(req.missionKey, e.target.value)
                        resolveMissionRequest(req.id)
                      }}
                    >
                      <option value="">Réassigner à…</option>
                      {TECHNICIANS.filter(t => t.id !== req.techId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Techniciens */}
        <SectionLabel>Équipe</SectionLabel>
        <div className="flex flex-col gap-3">
          {techs.map(tech => {
            const base = BASES.find(b => b.name === tech.base)
            const missions = tech.planning.length
            const enCours = tech.planning.filter(p => p.statut === 'en_cours').length
            const unread = tech.notifications.filter(n => !n.read).length
            const totalDone = tech.planning.reduce((acc, p) => acc + p.tasks.filter(t => t.done).length, 0)
            const totalTasks = tech.planning.reduce((acc, p) => acc + p.tasks.length, 0)
            const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

            return (
              <div
                key={tech.id}
                className="card cursor-pointer hover:shadow-sm transition-all"
                onClick={() => setSelected(tech.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-600 font-display font-bold text-sm flex-shrink-0">
                    {tech.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tech.name}</p>
                      {unread > 0 && (
                        <div className="w-4 h-4 rounded-full bg-danger-400 flex items-center justify-center">
                          <span className="text-[9px] text-white font-medium">{unread}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-gray-400" />
                        <span className="text-xs text-gray-400">{base?.name || '—'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{tech.phone}</span>
                    </div>
                    {totalTasks > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-teal-400' : 'bg-amber-300'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{totalDone}/{totalTasks}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {enCours > 0 && <span className="pill-warn text-[10px]">{enCours} en cours</span>}
                    {missions === 0 && <span className="text-xs text-gray-400">Aucune mission</span>}
                    <ChevronRight size={14} className="text-gray-300 ml-1 inline" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal planning technicien */}
      {selectedTech && (
        <PlanningTech
          tech={selectedTech}
          onClose={() => setSelected(null)}
          onToggleTask={toggleTask}
          onReassign={reassign}
        />
      )}

      {/* Modal nouveau technicien */}
      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold">Nouveau technicien</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Nom <span className="text-danger-600">*</span></p>
                <input className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-navy-600" placeholder="Prénom Nom" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Téléphone</p>
                <input className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-navy-600" placeholder="06 12 34 56 78" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Base par défaut</p>
                <select className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-navy-600 bg-white" value={newBase} onChange={e => setNewBase(e.target.value)}>
                  {BASES.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setShowNew(false)}>Annuler</button>
              <button className="btn-primary flex-1 justify-center" onClick={addTech}><Check size={14} /> Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
