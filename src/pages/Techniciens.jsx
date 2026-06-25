import { useState } from 'react'
import { Plus, AlertTriangle, Check, Circle } from 'lucide-react'
import { TECHNICIANS, BOATS } from '@/lib/mock-data'
import { Card, SectionLabel, ProgressBar } from '@/components/ui'

export default function Techniciens() {
  const [techs, setTechs] = useState(TECHNICIANS)

  function toggleTask(techId, boatId, taskId) {
    setTechs(prev => prev.map(t => {
      if (t.id !== techId) return t
      return {
        ...t,
        tasks: {
          ...t.tasks,
          [boatId]: t.tasks[boatId].map(task =>
            task.id === taskId ? { ...task, done: !task.done } : task
          )
        }
      }
    }))
  }

  const allAlerts = techs.flatMap(t =>
    Object.entries(t.tasks).flatMap(([boatId, tasks]) =>
      tasks.filter(tk => tk.alert && !tk.done).map(tk => ({
        tech: t.name,
        boat: BOATS.find(b => b.id === boatId)?.name || boatId,
        task: tk.label,
      }))
    )
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Techniciens</h1>
          <p className="text-xs text-gray-400">Samedi 5 juillet · {techs.length} techniciens actifs</p>
        </div>
        <button className="btn-primary"><Plus size={14} /> Ajouter un technicien</button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {allAlerts.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Alertes en temps réel</SectionLabel>
            {allAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-lg p-2.5 mb-2 text-sm text-amber-800">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                <span className="flex-1"><strong>{a.boat}</strong> — {a.task} signalé par {a.tech}</span>
              </div>
            ))}
          </div>
        )}

        <SectionLabel>État des bateaux</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          {techs.map(tech => (
            Object.entries(tech.tasks).map(([boatId, tasks]) => {
              const boat = BOATS.find(b => b.id === boatId)
              const done = tasks.filter(t => t.done).length
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0

              return (
                <Card key={`${tech.id}-${boatId}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium">{boat?.name || boatId}</p>
                      <p className="text-xs text-gray-400">{tech.name}</p>
                    </div>
                    <span className={`text-sm font-medium ${pct === 100 ? 'text-teal-600' : pct >= 50 ? 'text-amber-600' : 'text-danger-600'}`}>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} variant={pct === 100 ? 'ok' : pct >= 50 ? 'warn' : 'danger'} />

                  <div className="mt-3 flex flex-col gap-1.5">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                          task.done ? 'bg-teal-50' :
                          task.alert ? 'bg-danger-50 border border-danger-100' :
                          'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => toggleTask(tech.id, boatId, task.id)}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${task.done ? 'bg-teal-400' : 'border border-gray-300'}`}>
                          {task.done && <Check size={10} className="text-white" />}
                        </div>
                        <span className={`text-xs flex-1 ${
                          task.done ? 'text-teal-800' :
                          task.alert ? 'text-danger-800 font-medium' :
                          'text-gray-600'
                        }`}>
                          {task.label}
                          {task.alert && !task.done && <span className="ml-1 text-danger-600">⚠</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {pct === 100 && (
                    <div className="mt-3 text-center">
                      <span className="pill-ok">Bateau prêt ✓</span>
                    </div>
                  )}
                </Card>
              )
            })
          ))}
        </div>
      </div>
    </div>
  )
}
