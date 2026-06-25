import { useState } from 'react'
import { Search, Star, MessageCircle, CalendarPlus, X, Check, Shield } from 'lucide-react'
import { SKIPPERS } from '@/lib/mock-data'
import { Card, SectionLabel, Avatar } from '@/components/ui'

const PERMIS_ICONS = { 'Côtier': '🪪', 'Hauturier': '🌊', 'CRR': '📻', 'STCW': '⛑️', 'Yachtmaster': '🏅' }

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

function SkipperDetail({ skipper, onClose }) {
  const july = Array.from({ length: 31 }, (_, i) => {
    const d = `2026-07-${String(i+1).padStart(2, '0')}`
    return { day: i+1, busy: skipper.availability.busy.includes(d) }
  })
  const firstDayOffset = new Date('2026-07-01').getDay()
  const padded = Array(firstDayOffset === 0 ? 6 : firstDayOffset - 1).fill(null)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-navy-600 flex items-center justify-center text-white font-display font-bold text-lg">{skipper.initials}</div>
          <div className="flex-1">
            <h2 className="font-display text-white text-base font-bold">{skipper.name}</h2>
            <p className="text-navy-100 text-xs">{skipper.location} · {skipper.missions} missions · {skipper.rating}★</p>
          </div>
          <div className="flex items-center gap-2">
            {skipper.available ? <span className="pill-ok">Disponible</span> : <span className="pill-blue">Sur demande</span>}
            <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-5">
          <div>
            <SectionLabel>Permis & certifications</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {skipper.permis.map(p => (
                <div key={p} className="card-sm">
                  <div className="text-base mb-1">{PERMIS_ICONS[p] || '📄'}</div>
                  <p className="text-xs font-medium">{p}</p>
                  <span className="pill-ok text-[9px] mt-1 inline-flex items-center gap-1"><Check size={8} />Vérifié</span>
                </div>
              ))}
            </div>

            <SectionLabel>Statistiques</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Missions', val: skipper.missions },
                { label: 'Note', val: skipper.rating },
                { label: '€/jour', val: skipper.rate },
              ].map(({ label, val }) => (
                <div key={label} className="card-sm text-center">
                  <p className="font-display text-lg font-bold text-navy-600">{val}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            <SectionLabel>Types de bateaux</SectionLabel>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {skipper.boats.map(b => (
                <span key={b} className="pill-blue">{b}</span>
              ))}
            </div>

            <SectionLabel>Avis des agences</SectionLabel>
            <div className="flex flex-col gap-2">
              {skipper.reviews.map((r, i) => (
                <div key={i} className="card-sm">
                  <div className="flex items-center justify-between mb-1"><span className="text-xs font-medium">{r.agency}</span><Stars rating={r.stars} /></div>
                  <p className="text-xs text-gray-500 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Disponibilités — juillet 2026</SectionLabel>
            <div className="mb-3">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['L','M','M','J','V','S','D'].map(d => <div key={d} className="text-[9px] text-center text-gray-400">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {padded.map((_, i) => <div key={`p${i}`} />)}
                {july.map(({ day, busy }) => (
                  <div key={day} className={`text-[10px] text-center py-1 rounded ${busy ? 'bg-danger-50 text-danger-800' : 'bg-teal-50 text-teal-800 font-medium'}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded bg-teal-200" />Dispo</div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded bg-danger-100" />Occupé</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-2">
          <button className="btn-primary flex-1 justify-center"><CalendarPlus size={14} /> Réserver pour une mission</button>
          <button className="btn-ghost flex-1 justify-center"><MessageCircle size={14} /> Contacter</button>
        </div>
      </div>
    </div>
  )
}

export default function Skippers() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState({ permis: '', boat: '' })

  const filtered = SKIPPERS.filter(s => {
    if (filter.permis && !s.permis.includes(filter.permis)) return false
    if (filter.boat && !s.boats.includes(filter.boat)) return false
    return true
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Trouver un skipper</h1>
          <p className="text-xs text-gray-400">{filtered.length} skippers disponibles · Marseille</p>
        </div>
        <div className="flex gap-2">
          <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600" onChange={e => setFilter(f => ({ ...f, permis: e.target.value }))}>
            <option value="">Tous permis</option>
            <option>Côtier</option>
            <option>Hauturier</option>
            <option>Yachtmaster</option>
          </select>
          <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600" onChange={e => setFilter(f => ({ ...f, boat: e.target.value }))}>
            <option value="">Tous bateaux</option>
            <option>Voilier</option>
            <option>Catamaran</option>
            <option>Moteur</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <Card className="divide-y divide-gray-50">
          {filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 transition-colors" onClick={() => setSelected(s)}>
              <div className={`avatar ${s.color}`}>{s.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  <Shield size={11} className="text-teal-600 flex-shrink-0" title="Vérifié Helmo" />
                </div>
                <p className="text-xs text-gray-400">{s.location} · {s.missions} missions</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {s.permis.map(p => <span key={p} className="pill-blue text-[9px]">{p}</span>)}
                  {s.boats.map(b => <span key={b} className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-full">{b}</span>)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <Stars rating={s.rating} />
                <p className="text-[10px] text-gray-400 mt-0.5">{s.rating} · Vérifié</p>
                <p className="text-sm font-medium text-navy-600 mt-0.5">{s.rate}€/j</p>
                {s.available ? <span className="pill-ok mt-1 inline-block">Dispo</span> : <span className="pill-blue mt-1 inline-block">Sur demande</span>}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {selected && <SkipperDetail skipper={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
