import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, FileText, Users, Star, Wrench, Anchor
} from 'lucide-react'
import { clsx } from 'clsx'
import { BRANDS } from '@/lib/mock-data'

const NAV = [
  {
    section: 'Gestion',
    items: [
      { to: '/', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      { to: '/planning', label: 'Planning', icon: Calendar },
      { to: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    section: 'Skippers',
    items: [
      { to: '/skippers', label: 'Trouver un skipper', icon: Users },
      { to: '/mes-skippers', label: 'Mes skippers', icon: Star },
    ],
  },
  {
    section: 'Opérations',
    items: [
      { to: '/techniciens', label: 'Techniciens', icon: Wrench },
      { to: '/bateaux', label: 'Mes bateaux', icon: Anchor },
    ],
  },
]

export const BrandContext = { current: 'midi-nautisme' }

export default function AppLayout() {
  const [activeBrand, setActiveBrand] = useState('midi-nautisme')
  const brand = BRANDS[activeBrand]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-48 bg-navy-900 flex flex-col flex-shrink-0">

        {/* Logo Helmo */}
        <div className="px-5 py-4 border-b border-navy-800">
          <span className="font-display text-white text-lg font-bold tracking-tight">
            Hel<span className="text-teal-200">mo</span>
          </span>
        </div>

        {/* Switch de marque */}
        <div className="px-3 py-3 border-b border-navy-800">
          <p className="text-[9px] font-medium uppercase tracking-widest text-navy-100 opacity-50 mb-2 px-2">Marque active</p>
          <div className="flex flex-col gap-1.5">
            {Object.values(BRANDS).map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all',
                  activeBrand === b.id
                    ? 'bg-white/10 border border-white/20'
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                {/* Logo initiales */}
                <div className={clsx(
                  'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 font-display',
                  b.id === 'midi-nautisme' ? 'bg-navy-600 text-white' : 'bg-teal-400 text-white'
                )}>
                  {b.logo}
                </div>
                <div className="min-w-0">
                  <p className={clsx('text-xs font-medium truncate', activeBrand === b.id ? 'text-white' : 'text-navy-100')}>{b.name}</p>
                  <p className="text-[9px] text-navy-100 opacity-50 truncate">{b.tagline}</p>
                </div>
                {activeBrand === b.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-200 flex-shrink-0 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pb-4 pt-2">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="px-5 pt-3 pb-1 text-[9px] font-medium uppercase tracking-widest text-navy-100 opacity-40">
                {section}
              </p>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => clsx('nav-item', isActive && 'active')}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Pied de sidebar */}
        <div className="border-t border-navy-800 px-4 py-3">
          <div className={clsx(
            'flex items-center gap-2 px-2 py-1.5 rounded-lg',
            activeBrand === 'midi-nautisme' ? 'bg-navy-800' : 'bg-teal-900/30'
          )}>
            <div className={clsx(
              'w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold font-display flex-shrink-0',
              activeBrand === 'midi-nautisme' ? 'bg-navy-600 text-white' : 'bg-teal-400 text-white'
            )}>
              {brand.logo}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-medium truncate">{brand.name}</p>
              <p className="text-[9px] text-navy-100 opacity-50 truncate">{brand.port.split(',')[0]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main — on passe la marque active via context */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet context={{ activeBrand, brand }} />
      </main>
    </div>
  )
}
