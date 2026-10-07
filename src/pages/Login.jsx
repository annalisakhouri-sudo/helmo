import { useNavigate } from 'react-router-dom'
import { Building2, Anchor, Wrench, Waves, Sparkles, KeyRound } from 'lucide-react'

const ROLES = [
  {
    id: 'agency',
    label: 'Agence',
    sub: 'Dashboard complet, planning, clients, documents',
    icon: Building2,
    color: '#1B4F8A',
    bg: 'rgba(27,79,138,0.08)',
    border: 'rgba(27,79,138,0.15)',
  },
  {
    id: 'skipper',
    label: 'Skipper',
    sub: 'Mes missions, disponibilités et messagerie',
    icon: Anchor,
    color: '#0F7D57',
    bg: 'rgba(15,125,87,0.08)',
    border: 'rgba(15,125,87,0.15)',
  },
  {
    id: 'technician',
    label: 'Technicien',
    sub: 'Planning check-in / check-out de l\'équipe',
    icon: Wrench,
    color: '#B36A0A',
    bg: 'rgba(179,106,10,0.08)',
    border: 'rgba(179,106,10,0.15)',
  },
  {
    id: 'menage',
    label: 'Ménage',
    sub: 'Planning des nettoyages, société sous-traitante',
    icon: Sparkles,
    color: '#0F7D57',
    bg: 'rgba(15,125,87,0.08)',
    border: 'rgba(15,125,87,0.15)',
  },
  {
    // Démo uniquement (07/10/2026) : idée à tester avec Marie, pas encore dans le produit.
    id: 'proprietaire',
    label: 'Propriétaire',
    sub: 'Démo : mon bateau, mes dates, mes demandes au loueur',
    icon: KeyRound,
    color: '#185FA5',
    bg: 'rgba(24,95,165,0.06)',
    border: 'rgba(24,95,165,0.15)',
  },
]

const COMPANIES = [
  { id: 'midi-nautisme', name: 'Midi Nautisme', logo: 'MN', accent: '#1B4F8A' },
  { id: 'locamotors', name: 'Locamotors', logo: 'LM', accent: '#0F7D57' },
]

export default function Login({ onLogin }) {
  const navigate = useNavigate()

  function enter(role) {
    const company = COMPANIES[0]
    onLogin({ company, role: role.id, name: company.name })
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      background: 'linear-gradient(135deg, #071E38 0%, #0D2F56 60%, #1A4A7A 100%)',
    }}>
      {/* Déco background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(93,202,165,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,79,138,0.15) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(93,202,165,0.12)', border: '1px solid rgba(93,202,165,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Waves size={22} color="#5DCAA5" />
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1 }}>
              Hel<span style={{ color: '#5DCAA5' }}>mo</span>
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, letterSpacing: '0.02em' }}>La barre entre vos mains</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 24, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0F1A2A' }}>
            Qui êtes-vous ?
          </h2>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Choisissez votre profil pour accéder à Helmo</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROLES.map(role => {
              const Icon = role.icon
              return (
                <button
                  key={role.id}
                  onClick={() => enter(role)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
                    borderRadius: 16, border: `1.5px solid ${role.border}`,
                    background: role.bg, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = role.color; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${role.color}20` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = role.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F1A2A', marginBottom: 2, fontFamily: 'Syne, sans-serif' }}>{role.label}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{role.sub}</p>
                  </div>
                  <span style={{ color: role.color, fontSize: 20, fontWeight: 300, flexShrink: 0 }}>›</span>
                </button>
              )
            })}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 24 }}>
          © 2026 Helmo · helmo.fr
        </p>
      </div>
    </div>
  )
}
