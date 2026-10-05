import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Wrench, Sparkles,
  Anchor, UserCircle, MessageCircle, LogOut, Tag, Receipt
} from 'lucide-react'
import { clsx } from 'clsx'
import { BRANDS } from '@/lib/mock-data'
import GlobalSearch from './GlobalSearch'
import { getUrgentClientAlerts, subscribeClients } from '@/lib/client-alerts'
import { getTotalUnread, subscribeMessages } from '@/lib/messaging'

const NAV = [
  {
    section: 'Au quotidien',
    items: [
      { to: '/', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      { to: '/planning', label: 'Planning', icon: Calendar },
      { to: '/clients', label: 'Clients', icon: UserCircle, badge: 'clientAlerts' },
      { to: '/facturation', label: 'Facturation', icon: Receipt },
      { to: '/messagerie', label: 'Messagerie', icon: MessageCircle, badge: 'messages' },
    ],
  },
  {
    section: 'Équipe',
    items: [
      { to: '/skippers', label: 'Skippers', icon: Users },
      { to: '/techniciens', label: 'Techniciens', icon: Wrench },
      { to: '/menage', label: 'Ménage', icon: Sparkles },
    ],
  },
  // Réglés une fois en début de saison : rangés en bas pour ne pas encombrer.
  {
    section: 'Réglages',
    items: [
      { to: '/bateaux', label: 'Mes bateaux', icon: Anchor },
      { to: '/options', label: 'Options & tarifs', icon: Tag },
    ],
  },
]

export default function AppLayout({ user, onLogout }) {
  const [activeBrand, setActiveBrand] = useState('midi-nautisme')
  const brand = BRANDS[activeBrand]
  const [, refresh] = useState(0)
  useEffect(() => subscribeClients(() => refresh(v => v + 1)), [])
  useEffect(() => subscribeMessages(() => refresh(v => v + 1)), [])
  const badges = { clientAlerts: getUrgentClientAlerts().length, messages: getTotalUnread('agency') }

  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-gray-50">
      <aside className="w-48 bg-navy-900 flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-navy-800">
          <span className="font-display text-white text-lg font-bold tracking-tight">
            Hel<span className="text-teal-200">mo</span>
          </span>
        </div>

        {/* Switch marque */}
        <div className="px-3 py-3 border-b border-navy-800">
          <p className="text-[9px] font-medium uppercase tracking-widest text-navy-100 opacity-50 mb-2 px-2">Marque active</p>
          <div className="flex flex-col gap-1.5">
            {Object.values(BRANDS).map(b => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all',
                  activeBrand === b.id ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5 border border-transparent'
                )}
              >
                <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 font-display', b.id === 'midi-nautisme' ? 'bg-navy-600 text-white' : 'bg-teal-400 text-white')}>
                  {b.logo}
                </div>
                <div className="min-w-0">
                  <p className={clsx('text-xs font-medium truncate', activeBrand === b.id ? 'text-white' : 'text-navy-100')}>{b.name}</p>
                  <p className="text-[9px] text-navy-100 opacity-50 truncate">{b.tagline}</p>
                </div>
                {activeBrand === b.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-200 flex-shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto pb-4 pt-2">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <p className="px-5 pt-3 pb-1 text-[9px] font-medium uppercase tracking-widest text-navy-100 opacity-40">{section}</p>
              {items.map(({ to, label, icon: Icon, badge }) => {
                const count = badge ? badges[badge] : 0
                return (
                  <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
                    <Icon size={14} /><span>{label}</span>
                    {count > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-danger-400 text-white text-[10px] font-bold flex items-center justify-center" title={`${count} alerte${count > 1 ? 's' : ''} urgente${count > 1 ? 's' : ''}`}>
                        {count}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer — user + logout */}
        <div className="border-t border-navy-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-display text-white flex-shrink-0"
              style={{ background: brand?.accent || '#185FA5' }}
            >
              {brand?.logo}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">{brand?.name}</p>
              <p className="text-[10px] text-navy-100 opacity-50 capitalize">{user?.role || 'agence'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-navy-100 hover:text-white transition-colors flex-shrink-0 ml-2 p-1 rounded hover:bg-navy-800"
            title="Se déconnecter"
          >
            <LogOut size={14} />
          </button>
        </div>

      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <GlobalSearch />
        <Outlet context={{ activeBrand, brand }} />
      </main>
    </div>
  )
}
