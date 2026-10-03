import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, Anchor, Users, UserCircle, Wrench, Sparkles, X } from 'lucide-react'
import { BOOKINGS, BOATS, SKIPPERS, CLIENTS, TECHNICIANS, MENAGE_PROVIDERS } from '@/lib/mock-data'

// Enlève accents et casse pour que "moreau", "Moreau" et "MÔREAU" matchent pareil.
function norm(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const TYPE_META = {
  booking: { label: 'Location', icon: Calendar, color: 'text-navy-600 bg-navy-50' },
  boat: { label: 'Bateau', icon: Anchor, color: 'text-teal-700 bg-teal-50' },
  skipper: { label: 'Skipper', icon: Users, color: 'text-amber-700 bg-amber-50' },
  client: { label: 'Client', icon: UserCircle, color: 'text-purple-700 bg-purple-50' },
  tech: { label: 'Technicien', icon: Wrench, color: 'text-gray-700 bg-gray-100' },
  menage: { label: 'Ménage', icon: Sparkles, color: 'text-teal-700 bg-teal-50' },
}

function search(query) {
  const q = norm(query.trim())
  if (q.length < 2) return []
  const results = []

  BOOKINGS.forEach(b => {
    if (norm(b.client).includes(q) || norm(b.boatName).includes(q)) {
      results.push({
        type: 'booking', key: `b-${b.id}`, title: b.client,
        subtitle: `${b.boatName} · ${b.start} → ${b.end}`,
        go: `/planning?highlight=${b.id}`,
      })
    }
  })
  BOATS.forEach(b => {
    if (norm(b.name).includes(q)) results.push({ type: 'boat', key: `bt-${b.id}`, title: b.name, subtitle: b.type || '', go: '/bateaux' })
  })
  SKIPPERS.forEach(s => {
    if (norm(s.name).includes(q)) results.push({ type: 'skipper', key: `s-${s.id}`, title: s.name, subtitle: s.location || '', go: '/skippers' })
  })
  CLIENTS.forEach(c => {
    if (norm(`${c.prenom} ${c.nom}`).includes(q) || norm(`${c.nom} ${c.prenom}`).includes(q)) {
      results.push({ type: 'client', key: `c-${c.id}`, title: `${c.prenom} ${c.nom}`, subtitle: c.email || '', go: `/clients?client=${c.id}` })
    }
  })
  TECHNICIANS.forEach(t => {
    if (norm(t.name).includes(q)) results.push({ type: 'tech', key: `t-${t.id}`, title: t.name, subtitle: t.base || '', go: '/techniciens' })
  })
  MENAGE_PROVIDERS.forEach(m => {
    if (norm(m.company).includes(q) || norm(m.contact).includes(q)) {
      results.push({ type: 'menage', key: `m-${m.id}`, title: m.company, subtitle: m.contact, go: '/menage' })
    }
  })

  // Les types les plus "parlants" d'abord, et on limite pour que la liste reste lisible.
  const order = ['booking', 'client', 'boat', 'skipper', 'tech', 'menage']
  results.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
  return results.slice(0, 10)
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const results = search(query)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function pick(r) {
    navigate(r.go)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative bg-white border-b border-gray-100 px-5 py-2.5 flex-shrink-0 z-40">
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-navy-600 focus:bg-white"
          placeholder="Rechercher un locataire, un bateau, un skipper, un client…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && results[0]) pick(results[0])
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        {query && (
          <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => { setQuery(''); setOpen(false) }}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-5 top-full mt-1 w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="text-xs text-gray-400 p-4 text-center">Aucun résultat pour « {query} »</p>
          ) : results.map(r => {
            const meta = TYPE_META[r.type]
            const Icon = meta.icon
            return (
              <button key={r.key} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors" onClick={() => pick(r)}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}><Icon size={13} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800 truncate">{r.title}</span>
                  <span className="block text-xs text-gray-400 truncate">{r.subtitle}</span>
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{meta.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
