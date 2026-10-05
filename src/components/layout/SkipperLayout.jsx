import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Calendar, DollarSign, Phone, Clock, MessageCircle, LogOut, Users, Repeat } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_SKIPPER = [
  { to: '/skipper', label: 'Planning', icon: Calendar },
  { to: '/skipper/missions', label: 'Missions', icon: Clock },
  { to: '/skipper/revenus', label: 'Revenus', icon: DollarSign },
  { to: '/skipper/contacts', label: 'Contacts', icon: Phone },
  { to: '/skipper/messagerie', label: 'Messagerie', icon: MessageCircle },
]

export function SkipperSidebar({ skipper, onLogout, activeTab, setTab }) {
  return (
    <aside className="w-48 bg-navy-900 flex flex-col flex-shrink-0">
      <div className="px-5 py-4 border-b border-navy-800">
        <span className="font-display text-white text-lg font-bold tracking-tight">
          Hel<span className="text-teal-200">mo</span>
        </span>
      </div>

      <div className="px-4 py-3 border-b border-navy-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {skipper.initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">{skipper.name}</p>
            <p className="text-[10px] text-navy-100 opacity-50">{skipper.location}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto pt-2">
        {[
          { id: 'planning', label: 'Planning', icon: Calendar },
          { id: 'missions', label: 'Missions', icon: Clock },
          { id: 'revenus', label: 'Revenus', icon: DollarSign },
          { id: 'contacts', label: 'Contacts', icon: Phone },
          { id: 'dispos', label: 'Disponibilités', icon: Calendar },
          { id: 'messagerie', label: 'Messagerie', icon: MessageCircle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-5 py-2.5 text-xs border-l-2 transition-colors text-left',
              activeTab === id
                ? 'bg-navy-600 text-white border-l-teal-200'
                : 'text-navy-100 border-l-transparent hover:bg-navy-800'
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-navy-800 px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-navy-100 opacity-50">Skipper</p>
        <button onClick={onLogout} className="text-navy-100 hover:text-white transition-colors p-1 rounded hover:bg-navy-800">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}

export function TechSidebar({ tech, onLogout, activeView, setView }) {
  return (
    <aside className="w-48 bg-navy-900 flex flex-col flex-shrink-0">
      <div className="px-5 py-4 border-b border-navy-800">
        <span className="font-display text-white text-lg font-bold tracking-tight">
          Hel<span className="text-teal-200">mo</span>
        </span>
      </div>

      <div className="px-4 py-3 border-b border-navy-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {tech?.initials || 'TC'}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white font-medium truncate">{tech?.name || 'Technicien'}</p>
            <p className="text-[10px] text-navy-100 opacity-50">{tech?.base || 'Base'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto pt-2">
        {[
          { id: 'planning', label: 'Mon planning', icon: Calendar },
          { id: 'equipe', label: 'Équipe', icon: Users },
          { id: 'switch', label: 'Changer de technicien', icon: Repeat },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-5 py-2.5 text-xs border-l-2 transition-colors text-left',
              activeView === id
                ? 'bg-navy-600 text-white border-l-teal-200'
                : 'text-navy-100 border-l-transparent hover:bg-navy-800'
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-navy-800 px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-navy-100 opacity-50">Technicien</p>
        <button onClick={onLogout} className="text-navy-100 hover:text-white transition-colors p-1 rounded hover:bg-navy-800">
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
