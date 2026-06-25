import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Search, Plus } from 'lucide-react'
import { BOATS, BOOKINGS } from '@/lib/mock-data'
import { StatCard, AlertBanner, Card, SectionLabel } from '@/components/ui'

function getDocAlerts(boats) {
  const alerts = []
  boats.forEach(boat => {
    Object.entries(boat.docs).forEach(([key, doc]) => {
      if (doc.status === 'danger') alerts.push({ boat: boat.name, key, doc, type: 'danger' })
      if (doc.status === 'warn') alerts.push({ boat: boat.name, key, doc, type: 'warn' })
    })
  })
  return alerts.sort((a, b) => (a.type === 'danger' ? -1 : 1))
}

const DOC_NAMES = { francisation: 'Francisation', assurance: 'Assurance', securite: 'Sécurité', jauge: 'Jauge' }

export default function Dashboard() {
  const navigate = useNavigate()
  const alerts = getDocAlerts(BOATS)
  const docMissing = BOATS.reduce((acc, b) =>
    acc + Object.values(b.docs).filter(d => d.status !== 'ok').length, 0)
  const skipperMissing = BOOKINGS.filter(b => b.needsSkipper && !b.skipperId).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topbar */}
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Bonjour, Midi Nautisme</h1>
          <p className="text-xs text-gray-400">Saison 2026 · Marseille</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => navigate('/skippers')}>
            <Search size={14} /> Trouver un skipper
          </button>
          <button className="btn-primary" onClick={() => navigate('/planning')}>
            <Plus size={14} /> Ajouter une loc
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {/* Métriques */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard label="Bateaux actifs" value={BOATS.length} />
          <StatCard label="Alertes docs" value={docMissing} variant={docMissing > 0 ? 'warn' : 'ok'} sub={docMissing > 0 ? 'à régulariser' : 'tout est ok'} />
          <StatCard label="Missions ce mois" value="12" sub="+3 vs juillet" variant="ok" />
          <StatCard label="Skippers manquants" value={skipperMissing} variant={skipperMissing > 0 ? 'warn' : 'ok'} sub={skipperMissing > 0 ? 'locations sans skipper' : 'tout assigné'} />
        </div>

        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            <SectionLabel>Alertes en cours</SectionLabel>
            {alerts.map((a, i) => (
              <AlertBanner
                key={i}
                variant={a.type === 'danger' ? 'danger' : 'warn'}
                icon={<AlertTriangle size={15} />}
                action="Mettre à jour"
                onAction={() => navigate('/documents')}
              >
                <strong>{a.boat}</strong> — {DOC_NAMES[a.key]} : {a.doc.label}
              </AlertBanner>
            ))}
          </div>
        )}

        {/* Accès rapides */}
        <SectionLabel>Accès rapides</SectionLabel>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Planning semaine', sub: 'Voir toutes les locs', to: '/planning', emoji: '📅' },
            { label: 'Trouver un skipper', sub: '12 disponibles maintenant', to: '/skippers', emoji: '⚓' },
            { label: 'Techniciens', sub: 'Avancement du samedi', to: '/techniciens', emoji: '🔧' },
          ].map(({ label, sub, to, emoji }) => (
            <Card key={to} className="cursor-pointer hover:border-navy-100" onClick={() => navigate(to)}>
              <div className="text-2xl mb-2">{emoji}</div>
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </Card>
          ))}
        </div>

        {/* Dernières locs */}
        <SectionLabel>Locations cette semaine</SectionLabel>
        <Card>
          {BOOKINGS.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded transition-colors"
              onClick={() => navigate('/planning')}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                b.color === 'teal' ? 'bg-teal-400' :
                b.color === 'amber' ? 'bg-amber-200' : 'bg-danger-400'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{b.client}</p>
                <p className="text-xs text-gray-400">{b.boatName} · {b.start} → {b.end}</p>
              </div>
              {b.status === 'confirmed' && <span className="pill-ok">Confirmée</span>}
              {b.status === 'skipper-missing' && <span className="pill-warn">Skipper manquant</span>}
              {b.status === 'doc-issue' && <span className="pill-danger">Doc manquant</span>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
