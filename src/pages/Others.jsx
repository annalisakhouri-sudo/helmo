import { useNavigate } from 'react-router-dom'
import { Star, CalendarPlus } from 'lucide-react'
import { SKIPPERS } from '@/lib/mock-data'
import { Card, SectionLabel } from '@/components/ui'

export function MesSkippers() {
  const navigate = useNavigate()
  const favorites = SKIPPERS.slice(0, 2)
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Mes skippers</h1>
          <p className="text-xs text-gray-400">Favoris & historique de missions</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <SectionLabel>Skippers favoris</SectionLabel>
        <Card className="divide-y divide-gray-50">
          {favorites.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`avatar ${s.color}`}>{s.initials}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-gray-400">12 missions avec vous · Dernière : juin 2026</p>
              </div>
              <div className="flex items-center gap-2">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-xs text-gray-400">{s.rating}</span>
                <button className="btn-primary py-1 px-3 text-xs" onClick={() => navigate('/skippers')}>
                  <CalendarPlus size={12} /> Réserver
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function Bateaux() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Mes bateaux</h1>
          <p className="text-xs text-gray-400">Gestion de la flotte</p>
        </div>
        <button className="btn-primary">+ Ajouter un bateau</button>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <p className="text-sm text-gray-400">Voir l'onglet Documents pour l'état de vos bateaux.</p>
      </div>
    </div>
  )
}
