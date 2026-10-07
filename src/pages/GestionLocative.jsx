// Onglet agence « Propriétaires » (gestion locative) — DÉMO, à tester avec Marie.
// Le pendant de l'espace propriétaire (src/pages/ProprietaireDashboard.jsx) : mêmes données
// (src/lib/owner-space.js), donc ce que fait le propriétaire arrive ici, et inversement.
// L'agence y traite les demandes de services, répond aux messages, voit les dates que le
// propriétaire garde pour lui, et choisit ce qu'il voit dans son espace.
import { useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Wrench, CalendarDays, MessageCircle, Eye, Check, X, Phone, Mail, Ship, Send, Info } from 'lucide-react'
import {
  OWNERS, VISIBILITY_ITEMS, SERVICE_STATUS, TODAY, serviceLabel,
  subscribeOwner, getOwnerBoat, getVisibility, setVisibility, getOwnerBlocks, getOwnerServices, setServiceStatus,
  getOwnerMessages, sendOwnerMessage, markRead, getOwnerToDo, getRevenue,
} from '@/lib/owner-space'
import { fmtDate, fmtRange } from '@/lib/dates'

function Section({ icon: Icon, title, aside, children }) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-navy-600" />
        <h2 className="font-display text-sm font-bold text-gray-900">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

function Requests({ owner }) {
  const all = getOwnerServices(owner.id)
  const open = all.filter(s => s.status === 'envoyee' || s.status === 'acceptee')
  const closed = all.filter(s => s.status === 'faite' || s.status === 'refusee')
  const Row = ({ s }) => (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
      <div className="flex-1 min-w-[200px]">
        <p className="text-xs font-semibold text-gray-800">{serviceLabel(s.type)}{s.date && <span className="font-normal text-gray-500"> · pour le {fmtDate(s.date, true)}</span>}</p>
        {s.note && <p className="text-xs text-gray-500">{s.note}</p>}
        <p className="text-[10px] text-gray-400">Demandée le {fmtDate(s.createdAt, true)}</p>
      </div>
      {s.status === 'envoyee' && (
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-ghost text-xs py-1" onClick={() => setServiceStatus(s.id, 'refusee')}><X size={12} /> Refuser</button>
          <button className="btn-primary text-xs py-1" onClick={() => setServiceStatus(s.id, 'acceptee')}><Check size={12} /> Accepter</button>
        </div>
      )}
      {s.status === 'acceptee' && <button className="btn-primary text-xs py-1" onClick={() => setServiceStatus(s.id, 'faite')}><Check size={12} /> Marquer faite</button>}
      {s.status === 'faite' && <span className="pill-ok">Faite</span>}
      {s.status === 'refusee' && <span className="pill-danger">Refusée</span>}
    </div>
  )
  return (
    <Section icon={Wrench} title="Demandes de services" aside={open.length > 0 && <span className="pill-warn">{open.length} en cours</span>}>
      {open.length === 0 && <p className="text-xs text-gray-400">Aucune demande en cours.</p>}
      {open.map(s => <Row key={s.id} s={s} />)}
      {closed.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500">Demandes terminées ({closed.length})</summary>
          <div className="flex flex-col gap-1.5 mt-2">{closed.map(s => <Row key={s.id} s={s} />)}</div>
        </details>
      )}
      <p className="text-[10px] text-gray-400 flex gap-1"><Info size={11} className="flex-shrink-0 mt-px" />Le propriétaire voit la réponse tout de suite. En production, une demande acceptée deviendra une mission (technicien ou société de ménage) et le prix sera fixé ici.</p>
    </Section>
  )
}

function Blocks({ owner }) {
  const navigate = useNavigate()
  const blocks = getOwnerBlocks(owner.id).filter(b => b.end >= TODAY)
  return (
    <Section icon={CalendarDays} title="Dates gardées par le propriétaire">
      {blocks.length === 0 && <p className="text-xs text-gray-400">Aucune date à venir.</p>}
      {blocks.map(b => (
        <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50">
          <CalendarDays size={14} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800">{fmtRange(b.start, b.end)}</p>
            <p className="text-[11px] text-gray-500">{b.label} · réservé le {fmtDate(b.createdAt, true)}</p>
          </div>
          <button className="text-[11px] text-navy-600 font-medium" onClick={() => navigate('/planning')}>Planning →</button>
        </div>
      ))}
      <p className="text-[10px] text-gray-400">Ces dates apparaissent dans le Planning (vue semaine) : le bateau n'est pas à louer ces jours-là.</p>
    </Section>
  )
}

function Thread({ owner }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)
  const messages = getOwnerMessages(owner.id)
  useEffect(() => { markRead('agency', owner.id) }, [owner.id, messages.length])
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [owner.id, messages.length])
  function submit(e) { e.preventDefault(); sendOwnerMessage(owner.id, 'agency', text); setText('') }
  return (
    <Section icon={MessageCircle} title={`Messages avec ${owner.name}`}>
      <div ref={listRef} className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {messages.map(m => {
          const mine = m.from === 'agency'
          return (
            <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${mine ? 'self-end bg-navy-600 text-white' : 'self-start bg-gray-100 text-gray-800'}`}>
              <p>{m.text}</p>
              <p className={`text-[10px] mt-0.5 ${mine ? 'text-navy-100' : 'text-gray-400'}`}>{mine ? 'Vous' : owner.name} · {m.date}</p>
            </div>
          )
        })}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="agency-owner-msg">Répondre</label>
        <input id="agency-owner-msg" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" placeholder="Répondre au propriétaire…" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" className="btn-primary text-xs"><Send size={13} /> Envoyer</button>
      </form>
      <p className="text-[10px] text-gray-400">Fil partagé avec le propriétaire. Votre messagerie interne (skippers, techniciens, ménage) ne lui est jamais visible.</p>
    </Section>
  )
}

function Visibility({ owner }) {
  const vis = getVisibility(owner.id)
  return (
    <Section icon={Eye} title="Ce que voit le propriétaire">
      <div className="flex flex-col divide-y divide-gray-100">
        {VISIBILITY_ITEMS.map(v => (
          <label key={v.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800">{v.label}</p>
              <p className="text-[11px] text-gray-500">{v.hint}</p>
            </div>
            <input type="checkbox" className="sr-only peer" checked={!!vis[v.id]} onChange={e => setVisibility(owner.id, v.id, e.target.checked)} />
            <span aria-hidden="true" className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-teal-400 relative transition-colors flex-shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        ))}
      </div>
      <p className="text-[11px] text-gray-500">Toujours possible pour lui : réserver son bateau, demander un service, vous écrire. Jamais visible : les noms et coordonnées des locataires.</p>
    </Section>
  )
}

export default function GestionLocative() {
  const { activeBrand } = useOutletContext() || { activeBrand: 'midi-nautisme' }
  const owners = OWNERS.filter(o => getOwnerBoat(o)?.brand === activeBrand)
  const [selectedId, setSelectedId] = useState(owners[0]?.id || null)
  const [, refresh] = useState(0)
  useEffect(() => subscribeOwner(() => refresh(v => v + 1)), [])
  const owner = owners.find(o => o.id === selectedId) || owners[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Propriétaires</h1>
          <p className="text-xs text-gray-400">Gestion locative · bateaux confiés par leurs propriétaires · démo</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {!owner ? (
          <p className="card text-sm text-gray-500">Aucun bateau en gestion locative pour cette marque.</p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Liste des propriétaires */}
            <div className="w-full lg:w-56 flex-shrink-0 flex flex-col gap-2">
              {owners.map(o => {
                const todo = getOwnerToDo(o.id)
                const active = o.id === owner.id
                return (
                  <button key={o.id} onClick={() => setSelectedId(o.id)} className={`card text-left flex items-center gap-3 ${active ? 'border-navy-200 ring-1 ring-navy-200' : 'hover:border-navy-100'}`}>
                    <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center flex-shrink-0">{o.initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{o.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{getOwnerBoat(o)?.name}</p>
                    </div>
                    {todo.total > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-danger-400 text-white text-[10px] font-bold flex items-center justify-center">{todo.total}</span>}
                  </button>
                )
              })}
            </div>

            {/* Fiche du propriétaire sélectionné */}
            <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
              <div className="card flex flex-wrap items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center"><Ship size={20} className="text-navy-600" /></div>
                <div className="flex-1 min-w-[220px]">
                  <p className="font-display text-base font-bold text-gray-900">{owner.name}</p>
                  <p className="text-xs text-gray-500">{getOwnerBoat(owner)?.name} · {getOwnerBoat(owner)?.modele} · part propriétaire {Math.round(owner.ownerShare * 100)} % (démo)</p>
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><Phone size={12} />{owner.phone}</span>
                  <span className="flex items-center gap-1.5"><Mail size={12} />{owner.email}</span>
                </div>
                <div className="card-sm text-xs text-gray-600">Reversé 2026 : <strong className="text-gray-900">{getRevenue(owner).ownerTotal.toLocaleString('fr-FR')} €</strong></div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2 items-start">
                <div className="flex flex-col gap-4">
                  <Requests owner={owner} />
                  <Blocks owner={owner} />
                </div>
                <div className="flex flex-col gap-4">
                  <Thread owner={owner} />
                  <Visibility owner={owner} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
