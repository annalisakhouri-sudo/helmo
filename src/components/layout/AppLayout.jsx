import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, FileText, Users, Star, Wrench, Anchor, Settings, LogOut
} from 'lucide-react'
import { clsx } from 'clsx'

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

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-48 bg-navy-900 flex flex-col flex-shrink-0">
        <div className="px-5 py-5">
          <span className="font-display text-white text-lg font-bold tracking-tight">
            Hel<span className="text-teal-200">mo</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="px-5 pt-4 pb-1 text-[9px] font-medium uppercase tracking-widest text-navy-100 opacity-60">
                {section}
              </p>
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    clsx('nav-item', isActive && 'active')
                  }
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-navy-800 px-5 py-3">
          <p className="text-xs text-navy-100 font-medium mb-0.5">Midi Nautisme</p>
          <p className="text-[10px] text-navy-100 opacity-50">Marseille · Saison 2026</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
