import { useState } from 'react'
import { Plus, X, Check, AlertTriangle, Bell, ChevronRight, MapPin, Calendar, Clock } from 'lucide-react'
import { parseISO, addDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BOATS, BOOKINGS, TECHNICIANS } from '@/lib/mock-data'
import { Card, SectionLabel } from '@/components/ui'

const BASES = [
  { id: 'base-1', name: 'Vieux-Port', port: 'Quai de la Criée — Marseille' },
  { id: 'base-2', name: 'Port Corbières', port: 'Port de Corbières — Marseille' },
]

const TODAY_STR = '2026-07-04'

// Calcule le samedi de la semaine courante (ou égal si déjà samedi) — même logique que Dashboard/Planning.
function getSaturdayOnOrBefore(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 1) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const DEFAULT_DEPART_TASKS = [
  { label: 'Nettoyage cabines' },
  { label: 'Draps posés' },
  { label: 'Inventaire vérifié' },
  { label: 'Équipements sécurité' },
]
// Retour avec dernière nuit à bord : le client part samedi matin (~10h), le technicien
// fait l'état des lieux après son départ.
const RETOUR_SAMEDI_TASKS = [
  { label: 'Vérification état général' },
  { label: 'Inventaire retour' },
  { label: 'Nettoyage' },
  { label: 'Rapport état des lieux' },
]
// Retour SANS dernière nuit à bord : le client rend le bateau vendredi soir, le technicien
// fait le check-out avec lui sur place, puis prépare déjà draps/nettoyage.
const RETOUR_VENDREDI_TASKS = [
  { label: 'Check-out avec le client' },
  { label: 'Draps retirés' },
  { label: 'Nettoyage' },
  { label: 'Rapport état des lieux' },
]

function computeStatut(dateStr) {
  if (dateStr === TODAY_STR) return 'en_cours'
  if (dateStr < TODAY_STR) return 'termine'
  return 'a_venir'
}

// ── Construit les missions de chaque technicien à partir des VRAIES locations ──
// (au lieu d'une liste fictive) : pour chaque bateau qui lui est assigné, on regarde
// les locations réelles (BOOKINGS) et on génère un départ + un retour par location.
// Le retour tient compte de la nuitée à bord : sans nuitée, il a lieu vendredi soir
// (avec check-out client) ; avec nuitée, samedi matin.
function buildTechsFromBookings() {
  return TECHNICIANS.map(tech => {
    const missions = []
    tech.assignedBoats.forEach(boatId => {
      const boat = BOATS.find(b => b.id === boatId)
      if (!boat) return
      const boatBookings = BOOKINGS.filter(b => b.boatId === boatId)
      const seedTasks = tech.tasks?.[boatId] // tâches spécifiques déjà présentes dans les données de démo, si dispo

      boatBookings.forEach(b => {
        // ── Départ (préparation du bateau pour ce client) ──
        const departDate = b.start
        missions.push({
          id: `dep-${tech.id}-${b.id}`,
          type: 'depart',
          date: departDate,
          weekStart: format(getSaturdayOnOrBefore(parseISO(departDate)), 'yyyy-MM-dd'),
          boat: boat.name,
          client: b.client,
          heure: '08:30',
          statut: computeStatut(departDate),
          tasks: (seedTasks && seedTasks.length ? seedTasks : DEFAULT_DEPART_TASKS).map((t, i) => ({ id: t.id || `${tech.id}-${b.id}-d${i}`, label: t.label, done: t.done ?? false })),
        })

        // ── Retour (état des lieux au retour de ce client) ──
        const hasLastNight = b.lastNightAboard !== false
        const retourDate = hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
        const retourHeure = hasLastNight ? '10:00' : '17:00'
        const retourTasks = hasLastNight ? RETOUR_SAMEDI_TASKS : RETOUR_VENDREDI_TASKS
        missions.push({
          id: `ret-${tech.id}-${b.id}`,
          type: 'retour',
          date: retourDate,
          weekStart: format(getSaturdayOnOrBefore(parseISO(retourDate)), 'yyyy-MM-dd'),
          boat: boat.name,
          client: b.client,
          heure: retourHeure,
          moment: hasLastNight ? 'Samedi matin' : 'Vendredi soir',
          statut: computeStatut(retourDate),
          tasks: retourTasks.map((t, i) => ({ id: `${tech.id}-${b.id}-r${i}`, label: t.label, done: false })),
        })
      })
    })
    // Ordre chronologique, et à date égale, les retours priment sur les départs
    // (le bateau doit être rendu avant de pouvoir repartir).
    missions.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'retour' ? -1 : 1) - (b.type === 'retour' ? -1 : 1))
    return { id: tech.id, name: tech.name, phone: tech.phone, base: tech.base, planning: missions, notifications: [] }
  })
}

function PlanningTech({ tech, onClose, onToggleTask }) {
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
                                  <div className="flex flex-col gap-1.5">
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
  const [techs, setTechs] = useState(buildTechsFromBookings)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newBase, setNewBase] = useState(BASES[0].name)

  function toggleTask(techId, planId, taskId) {
    setTechs(prev => prev.map(t => {
      if (t.id !== techId) return t
      return {
        ...t,
        planning: t.planning.map(p => {
          if (p.id !== planId) return p
          return { ...p, tasks: p.tasks.map(tk => tk.id === taskId ? { ...tk, done: !tk.done } : tk) }
        })
      }
    }))
  }

  function addTech() {
    if (!newName.trim()) return
    setTechs(prev => [...prev, {
      id: 'tech-' + Date.now(), name: newName, phone: newPhone, base: newBase,
      planning: [], notifications: [],
    }])
    setNewName(''); setNewPhone(''); setNewBase('base-1'); setShowNew(false)
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
