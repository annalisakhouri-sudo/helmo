// Espace propriétaire — écran de DÉMO (décision du 07/10/2026), pour tester l'idée avec Marie.
// Deux vues dans le même écran, pour la démo uniquement :
// - « Vue propriétaire » : ce que voit le propriétaire du bateau ;
// - « Réglages du loueur » : ce que l'agence choisit de lui montrer, et ses demandes à traiter.
// En production, les réglages du loueur iront dans la fiche bateau côté agence.
// Toute la logique est dans src/lib/owner-space.js.
import { useState, useEffect, useRef } from 'react'
import { LogOut, Calendar, Wrench, Euro, ClipboardCheck, MessageCircle, Lock, Send, Check, X, Eye, EyeOff, Info, Anchor, Plus, Trash2 } from 'lucide-react'
import {
  DEMO_OWNER, SERVICE_TYPES, VISIBILITY_ITEMS, TODAY,
  getOwnerState, subscribeOwner, setVisibility, getOwnerBoat, getBoatRentals,
  addBlock, removeBlock, getRevenue, getBoatMissions, requestService, setServiceStatus, sendOwnerMessage,
} from '@/lib/owner-space'
import { fmtDate, fmtRange } from '@/lib/dates'

const eur = n => n.toLocaleString('fr-FR') + ' €'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const STATUS = {
  envoyee: { label: 'Envoyée', cls: 'pill-blue' },
  acceptee: { label: 'Acceptée', cls: 'pill-warn' },
  faite: { label: 'Faite', cls: 'pill-ok' },
  refusee: { label: 'Refusée', cls: 'pill-danger' },
}
const serviceLabel = id => SERVICE_TYPES.find(t => t.id === id)?.label || id

function Section({ icon: Icon, title, children, aside }) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-navy-600" />
        <h2 className="font-display text-sm font-bold text-gray-900">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

// ── Planning : bande des 26 prochaines semaines + liste + blocage de dates ──
function PlanningSection({ st, showAmounts }) {
  const rentals = getBoatRentals()
  const [form, setForm] = useState({ start: '', end: '', label: '' })
  const [error, setError] = useState('')
  const weeks = Array.from({ length: 26 }, (_, i) => {
    const start = addDays(TODAY, i * 7)
    const p = { start, end: addDays(start, 7) }
    const hit = list => list.some(x => x.start < p.end && p.start < (x.start === x.end ? addDays(x.end, 1) : x.end))
    return { start, state: hit(st.blocks) ? 'bloque' : hit(rentals) ? 'loue' : 'libre' }
  })
  // Les dates bloquées du propriétaire sont toujours listées ; seulement les 4 prochaines
  // locations (sinon l'été les noie).
  const upcoming = [
    ...rentals.filter(r => r.end > TODAY).slice(0, 4).map(r => ({ ...r, kind: 'loue' })),
    ...st.blocks.filter(b => b.end >= TODAY).map(b => ({ ...b, kind: 'bloque' })),
  ].sort((a, b) => a.start.localeCompare(b.start))

  function submit(e) {
    e.preventDefault()
    const res = addBlock(form.start, form.end, form.label)
    if (!res.ok) { setError(res.error); return }
    setForm({ start: '', end: '', label: '' }); setError('')
  }

  return (
    <Section icon={Calendar} title="Planning du bateau">
      <div>
        <div className="flex gap-0.5" role="img" aria-label="26 prochaines semaines : louées, bloquées par vous, libres">
          {weeks.map(w => (
            <div key={w.start} title={`Semaine du ${fmtDate(w.start)}`} className={`flex-1 h-7 rounded-sm ${w.state === 'loue' ? 'bg-navy-600' : w.state === 'bloque' ? 'bg-amber-200' : 'bg-gray-100'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{fmtDate(weeks[0].start)}</span><span>{fmtDate(weeks[25].start)}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy-600" />Loué</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200" />Bloqué par vous</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />Libre</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {upcoming.map(x => (
          <div key={x.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${x.kind === 'bloque' ? 'bg-amber-50' : 'bg-gray-50'}`}>
            {x.kind === 'bloque' ? <Lock size={13} className="text-amber-600 flex-shrink-0" /> : <Anchor size={13} className="text-navy-600 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800">{fmtRange(x.start, x.end)}</p>
              <p className="text-[11px] text-gray-500">{x.kind === 'bloque' ? x.label : 'Location'}</p>
            </div>
            {x.kind === 'loue' && showAmounts && <span className="text-xs font-medium text-gray-700">{eur(x.amount)}</span>}
            {x.kind === 'bloque' && x.start >= TODAY && (
              <button type="button" className="p-1.5 rounded hover:bg-amber-100 text-amber-700" onClick={() => removeBlock(x.id)} aria-label="Libérer ces dates"><Trash2 size={13} /></button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-700">Bloquer des dates pour naviguer</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex-1 min-w-[130px] text-[11px] text-gray-500">Du
            <input type="date" className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
          </label>
          <label className="flex-1 min-w-[130px] text-[11px] text-gray-500">Au
            <input type="date" className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
          </label>
          <label className="flex-[2] min-w-[160px] text-[11px] text-gray-500">Note (facultatif)
            <input type="text" placeholder="Ex : vacances en famille" className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          </label>
        </div>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        <button type="submit" className="btn-primary text-xs self-start"><Lock size={12} /> Bloquer ces dates</button>
        <p className="text-[10px] text-gray-400">Le loueur voit ces dates : le bateau n'est plus proposé à la location.</p>
      </form>
    </Section>
  )
}

function ServicesSection({ st }) {
  const [form, setForm] = useState({ type: 'preparation', date: '', note: '' })
  const [sent, setSent] = useState(false)
  function submit(e) {
    e.preventDefault()
    requestService(form.type, form.date, form.note)
    setForm({ type: 'preparation', date: '', note: '' }); setSent(true)
    setTimeout(() => setSent(false), 3000)
  }
  return (
    <Section icon={Wrench} title="Demander un service au loueur">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <label className="flex-[2] min-w-[180px] text-[11px] text-gray-500">Service
            <select className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {SERVICE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex-1 min-w-[130px] text-[11px] text-gray-500">Pour le
            <input type="date" className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </label>
        </div>
        <label className="text-[11px] text-gray-500">Précisions
          <textarea rows={2} placeholder="Ex : pleins faits, draps pour 6 personnes" className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary text-xs"><Send size={12} /> Envoyer la demande</button>
          {sent && <span className="text-xs text-teal-700 flex items-center gap-1"><Check size={12} /> Demande envoyée au loueur</span>}
        </div>
      </form>
      <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-3">
        {st.services.map(s => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800">{serviceLabel(s.type)}{s.date && <span className="font-normal text-gray-500"> · {fmtDate(s.date, true)}</span>}</p>
              {s.note && <p className="text-[11px] text-gray-500 truncate">{s.note}</p>}
            </div>
            <span className={STATUS[s.status].cls}>{STATUS[s.status].label}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RevenueSection() {
  const r = getRevenue('2026')
  const max = Math.max(...r.byMonth, 1)
  return (
    <Section icon={Euro} title="Revenus de location · 2026">
      <div className="flex flex-wrap gap-3">
        {[
          ['Locations', r.weeks],
          ['Déjà encaissé', eur(r.past)],
          ['Réservé à venir', eur(r.upcoming)],
          [`Votre part (${Math.round(DEMO_OWNER.ownerShare * 100)} %)`, eur(r.ownerPart)],
        ].map(([l, v]) => (
          <div key={l} className="basis-[calc(50%-6px)] flex-grow card-sm">
            <p className="font-display text-lg font-bold text-gray-900">{v}</p>
            <p className="text-[11px] text-gray-500">{l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-end gap-1 h-20" role="img" aria-label="Revenus de location par mois en 2026">
          {r.byMonth.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end h-full" title={`${MONTHS[i]} : ${eur(v)}`}>
              <div className={`rounded-t-sm ${i + 1 < 7 ? 'bg-navy-600' : 'bg-navy-100'}`} style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-1">{MONTHS.map(m => <span key={m} className="flex-1 text-center text-[9px] text-gray-400">{m}</span>)}</div>
      </div>
      <p className="text-[10px] text-gray-400 flex items-start gap-1"><Info size={11} className="flex-shrink-0 mt-px" />Démo : montants calculés depuis la grille tarifaire, part propriétaire de 70 % supposée. Le vrai taux dépend du contrat de gestion.</p>
    </Section>
  )
}

function MissionsSection() {
  const missions = getBoatMissions(8)
  return (
    <Section icon={ClipboardCheck} title="Missions faites sur le bateau">
      <div className="flex flex-col gap-1.5">
        {missions.map(m => (
          <div key={m.key} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-teal-400' : 'bg-gray-200'}`}>{m.done && <Check size={11} className="text-white" />}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800">{m.label}</p>
              <p className="text-[11px] text-gray-500">{fmtDate(m.date, true)} · {m.by}</p>
            </div>
          </div>
        ))}
        {missions.length === 0 && <p className="text-xs text-gray-400">Aucune mission pour l'instant.</p>}
      </div>
    </Section>
  )
}

function MessagesSection({ st, side }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)
  // Toujours afficher le dernier message (comme une messagerie).
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [st.messages.length])
  function submit(e) { e.preventDefault(); sendOwnerMessage(side, text); setText('') }
  return (
    <Section icon={MessageCircle} title={side === 'owner' ? 'Messages avec Midi Nautisme' : `Messages avec ${DEMO_OWNER.name}`}>
      <div ref={listRef} className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {st.messages.map(m => {
          const mine = m.from === side
          return (
            <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${mine ? 'self-end bg-navy-600 text-white' : 'self-start bg-gray-100 text-gray-800'}`}>
              <p>{m.text}</p>
              <p className={`text-[10px] mt-0.5 ${mine ? 'text-navy-100' : 'text-gray-400'}`}>{m.from === 'owner' ? DEMO_OWNER.name : 'Midi Nautisme'} · {m.date}</p>
            </div>
          )
        })}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor={`msg-${side}`}>Votre message</label>
        <input id={`msg-${side}`} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" placeholder="Écrire un message…" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" className="btn-primary text-xs" aria-label="Envoyer"><Send size={13} /></button>
      </form>
      {side === 'agency' && <p className="text-[10px] text-gray-400">Ce fil est partagé avec le propriétaire. Le fil interne de l'agence (techniciens, ménage, skippers) ne lui est jamais visible.</p>}
    </Section>
  )
}

// ── Vue loueur (démo) : visibilité + demandes reçues ──
function AgencySettings({ st }) {
  const pending = st.services.filter(s => s.status === 'envoyee' || s.status === 'acceptee')
  return (
    <div className="flex flex-col gap-4">
      <Section icon={Eye} title="Ce que voit le propriétaire">
        <p className="text-xs text-gray-500">Vous choisissez, bateau par bateau, ce que le propriétaire voit dans son espace.</p>
        <div className="flex flex-col divide-y divide-gray-100">
          {VISIBILITY_ITEMS.map(v => (
            <label key={v.id} className="flex items-center gap-3 py-2.5 cursor-pointer">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{v.label}</p>
                <p className="text-[11px] text-gray-500">{v.hint}</p>
              </div>
              <input type="checkbox" className="sr-only peer" checked={st.visibility[v.id]} onChange={e => setVisibility(v.id, e.target.checked)} />
              <span className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-teal-400 relative transition-colors flex-shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-navy-400 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" aria-hidden="true" />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Wrench} title={`Demandes de ${DEMO_OWNER.name}`} aside={pending.length > 0 && <span className="pill-warn">{pending.length} à traiter</span>}>
        <div className="flex flex-col gap-1.5">
          {st.services.map(s => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs font-medium text-gray-800">{serviceLabel(s.type)}{s.date && <span className="font-normal text-gray-500"> · {fmtDate(s.date, true)}</span>}</p>
                {s.note && <p className="text-[11px] text-gray-500">{s.note}</p>}
              </div>
              {s.status === 'envoyee' && <>
                <button className="btn-ghost text-xs py-1" onClick={() => setServiceStatus(s.id, 'refusee')}><X size={12} /> Refuser</button>
                <button className="btn-primary text-xs py-1" onClick={() => setServiceStatus(s.id, 'acceptee')}><Check size={12} /> Accepter</button>
              </>}
              {s.status === 'acceptee' && <button className="btn-primary text-xs py-1" onClick={() => setServiceStatus(s.id, 'faite')}><Check size={12} /> Marquer faite</button>}
              {(s.status === 'faite' || s.status === 'refusee') && <span className={STATUS[s.status].cls}>{STATUS[s.status].label}</span>}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">En production, une demande acceptée devient une mission (technicien ou société de ménage) et rejoint « À traiter ».</p>
      </Section>

      <MessagesSection st={st} side="agency" />
    </div>
  )
}

export default function ProprietaireDashboard({ onLogout }) {
  const [st, setSt] = useState(getOwnerState())
  const [view, setView] = useState('owner') // 'owner' | 'agency' — bascule de démo uniquement
  useEffect(() => subscribeOwner(setSt), [])
  const boat = getOwnerBoat()
  const v = st.visibility
  const nothingVisible = !Object.values(v).some(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="font-display text-lg font-bold tracking-tight">Hel<span className="text-teal-200">mo</span></span>
          <span className="text-[11px] text-navy-100 hidden sm:inline">Espace propriétaire</span>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{DEMO_OWNER.name}</p>
              <p className="text-[10px] text-navy-100">Propriétaire · géré par Midi Nautisme</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center text-xs font-bold">{DEMO_OWNER.initials}</div>
            <button onClick={onLogout} className="p-2 rounded hover:bg-navy-800" aria-label="Se déconnecter"><LogOut size={15} /></button>
          </div>
        </div>
      </header>

      {/* Bandeau de démo : signale les données fictives et permet de voir le côté loueur. */}
      <div className="bg-amber-50 border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-amber-800 flex-1 min-w-[220px]">Démo : propriétaire et données fictives. Rien n'est enregistré.</p>
          <div className="flex bg-white rounded-lg border border-amber-200 p-0.5" role="tablist" aria-label="Choisir la vue">
            {[['owner', 'Vue propriétaire'], ['agency', 'Réglages du loueur']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`text-[11px] px-3 py-1 rounded-md ${view === id ? 'bg-navy-600 text-white' : 'text-gray-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-4">
        <div className="card flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center"><Anchor size={20} className="text-navy-600" /></div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display text-lg font-bold text-gray-900">{boat.name}</h1>
            <p className="text-xs text-gray-500">{boat.modele} · {boat.annee} · {boat.length} m · {boat.cabines} cabines · {boat.port}</p>
          </div>
          <span className="pill-ok">En gestion chez Midi Nautisme</span>
        </div>

        {view === 'agency' ? <AgencySettings st={st} /> : (
          <>
            {nothingVisible && <p className="card text-sm text-gray-500 flex items-center gap-2"><EyeOff size={15} /> Le loueur n'a encore rien partagé avec vous.</p>}
            <div className="grid gap-4 md:grid-cols-2 items-start">
              <div className="flex flex-col gap-4">
                {v.planning && <PlanningSection st={st} showAmounts={v.revenus} />}
                {v.revenus && <RevenueSection />}
              </div>
              <div className="flex flex-col gap-4">
                {v.services && <ServicesSection st={st} />}
                {v.messages && <MessagesSection st={st} side="owner" />}
                {v.missions && <MissionsSection />}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
