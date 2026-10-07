// Espace propriétaire — DÉMO (décision du 07/10/2026), à tester avec Marie.
// Pour le propriétaire du bateau, souvent une personne âgée : tout doit être évident.
// Principes : une seule action par écran, gros boutons avec un texte (jamais une icône seule),
// des phrases complètes, une confirmation avant chaque engagement, un bouton « Retour » partout.
// Il voit tout sur SON bateau, sauf les locataires (il sait seulement que le bateau est loué).
// L'agence traite ses demandes dans son onglet « Propriétaires » (src/pages/GestionLocative.jsx).
// Logique : src/lib/owner-space.js.
import { useState, useEffect, useRef } from 'react'
import { CalendarDays, Wrench, MessageCircle, ClipboardCheck, Euro, ArrowLeft, Check, Sparkles, Anchor, Hammer, Ship, LogOut, ChevronRight } from 'lucide-react'
import {
  DEMO_OWNER, SERVICE_TYPES, SERVICE_STATUS, TODAY, serviceLabel,
  subscribeOwner, getOwnerState, getVisibility, getOwnerBoat, getBoatStatusToday, getUpcomingWeeks,
  getOwnerBlocks, addBlock, removeBlock, getRevenue, getBoatHistory, getOwnerServices, requestService,
  getOwnerMessages, sendOwnerMessage, getUnread, markRead,
} from '@/lib/owner-space'

const owner = DEMO_OWNER
const eur = n => n.toLocaleString('fr-FR') + ' €'
// Dates écrites en toutes lettres : « samedi 11 juillet ».
const longDate = (s, withYear = false) => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
const SERVICE_ICONS = { preparation: Anchor, menage: Sparkles, entretien: Wrench, sav: Hammer }

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="self-start flex items-center gap-2 min-h-[48px] px-4 rounded-xl bg-white border border-gray-200 text-base font-medium text-gray-700 hover:bg-gray-50">
      <ArrowLeft size={20} /> Retour
    </button>
  )
}

function BigButton({ icon: Icon, title, sub, onClick, badge, tone = 'primary' }) {
  const primary = tone === 'primary'
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-colors ${primary ? 'bg-navy-600 hover:bg-navy-800 text-white' : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-900'}`}>
      <span className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${primary ? 'bg-white/15' : 'bg-navy-50'}`}>
        <Icon size={28} className={primary ? 'text-white' : 'text-navy-600'} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xl font-semibold leading-tight">{title}</span>
        {sub && <span className={`block text-base mt-1 ${primary ? 'text-navy-50' : 'text-gray-500'}`}>{sub}</span>}
      </span>
      {badge && <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-sm font-semibold flex-shrink-0">{badge}</span>}
      <ChevronRight size={26} className={`flex-shrink-0 ${primary ? 'text-white/70' : 'text-gray-400'}`} />
    </button>
  )
}

function Title({ children, sub }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900">{children}</h1>
      {sub && <p className="text-lg text-gray-600 mt-1">{sub}</p>}
    </div>
  )
}

// ── Accueil ──
function Home({ go }) {
  const boat = getOwnerBoat()
  const vis = getVisibility(owner.id)
  const status = getBoatStatusToday()
  const unread = getUnread('owner', owner.id)
  const myDates = getOwnerBlocks(owner.id).filter(b => b.end >= TODAY)
  const myRequests = getOwnerServices(owner.id).filter(s => s.status === 'envoyee' || s.status === 'acceptee')
  const statusText = status.kind === 'mine'
    ? `Votre bateau est à vous jusqu'au ${longDate(status.until)}.`
    : status.kind === 'loue'
      ? `Votre bateau est ${vis.locations ? 'loué' : 'occupé'} jusqu'au ${longDate(status.until)}.`
      : 'Votre bateau est au port.'

  return (
    <div className="flex flex-col gap-5">
      <Title>Bonjour {owner.firstName}</Title>

      <div className="rounded-2xl bg-white border border-gray-200 p-5 flex items-center gap-4">
        <span className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0"><Ship size={28} className="text-teal-600" /></span>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-gray-900">{boat.name}</p>
          <p className="text-lg text-gray-700 mt-0.5">{statusText}</p>
          <p className="text-base text-gray-500 mt-0.5">Géré par Midi Nautisme · {boat.port}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BigButton icon={CalendarDays} title="Réserver mon bateau" sub="Choisir des dates pour naviguer" onClick={() => go('reserver')} />
        <BigButton icon={Wrench} title="Demander un service" sub="Préparation, ménage, entretien, réparation" onClick={() => go('service')} />
        <BigButton icon={MessageCircle} title="Écrire à l'agence" sub="Poser une question à Midi Nautisme" onClick={() => go('messages')} badge={unread ? `${unread} nouveau${unread > 1 ? 'x' : ''}` : null} />
      </div>

      {(vis.suivi || vis.revenus) && (
        <div className="flex flex-col gap-3">
          {vis.suivi && <BigButton tone="light" icon={ClipboardCheck} title="Suivi de mon bateau" sub="Ce qui a été fait dessus" onClick={() => go('suivi')} />}
          {vis.revenus && <BigButton tone="light" icon={Euro} title="Mes revenus" sub="Ce que rapportent les locations" onClick={() => go('revenus')} />}
        </div>
      )}

      {(myDates.length > 0 || myRequests.length > 0) && (
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col gap-3">
          <p className="text-lg font-semibold text-gray-900">En ce moment</p>
          {myDates.map(b => (
            <p key={b.id} className="text-base text-gray-700 flex gap-2"><CalendarDays size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />Bateau réservé pour vous du {longDate(b.start)} au {longDate(b.end)}.</p>
          ))}
          {myRequests.map(s => (
            <p key={s.id} className="text-base text-gray-700 flex gap-2"><Wrench size={20} className="text-navy-600 flex-shrink-0 mt-0.5" />{serviceLabel(s.type)} : {SERVICE_STATUS[s.status].toLowerCase()}.</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Réserver mon bateau ──
function Reserver({ back }) {
  const vis = getVisibility(owner.id)
  const weeks = getUpcomingWeeks(owner, 16)
  const [confirm, setConfirm] = useState(null) // { action: 'add' | 'remove', start, end, blockId }
  const [done, setDone] = useState(null)
  const [custom, setCustom] = useState(false)
  const [form, setForm] = useState({ start: '', end: '' })
  const [error, setError] = useState('')

  function validate() {
    if (confirm.action === 'remove') { removeBlock(confirm.blockId); setDone('Votre réservation est annulée. Le bateau peut de nouveau être loué ces jours-là.') }
    else {
      const res = addBlock(owner.id, confirm.start, confirm.end)
      if (!res.ok) { setError(res.error); setConfirm(null); return }
      setDone(`C'est noté : votre bateau est à vous du ${longDate(confirm.start)} au ${longDate(confirm.end)}. L'agence est prévenue.`)
    }
    setConfirm(null); setError('')
    window.scrollTo({ top: 0 })
  }

  if (done) return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-teal-50 border border-teal-100 p-6 flex flex-col items-center text-center gap-3">
        <span className="w-16 h-16 rounded-full bg-teal-400 flex items-center justify-center"><Check size={34} className="text-white" strokeWidth={3} /></span>
        <p className="text-xl text-teal-900 font-semibold">{done}</p>
      </div>
      <button type="button" onClick={back} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl">Revenir à l'accueil</button>
    </div>
  )

  if (confirm) return (
    <div className="flex flex-col gap-5">
      <Title>{confirm.action === 'add' ? 'Vous confirmez ?' : 'Annuler cette réservation ?'}</Title>
      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <p className="text-xl text-gray-900">
          {confirm.action === 'add'
            ? <>Vous gardez votre bateau du <strong>{longDate(confirm.start)}</strong> au <strong>{longDate(confirm.end)}</strong>.</>
            : <>Votre bateau pourra de nouveau être loué du <strong>{longDate(confirm.start)}</strong> au <strong>{longDate(confirm.end)}</strong>.</>}
        </p>
        {confirm.action === 'add' && <p className="text-lg text-gray-600 mt-2">Il ne sera pas loué ces jours-là.</p>}
      </div>
      <button type="button" onClick={validate} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl"><Check size={22} /> {confirm.action === 'add' ? 'Oui, je réserve' : 'Oui, j\'annule'}</button>
      <button type="button" onClick={() => setConfirm(null)} className="btn-ghost justify-center text-lg min-h-[56px] rounded-xl text-gray-700">Non, revenir</button>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <Title sub="Touchez « Réserver » sur une semaine libre.">Réserver mon bateau</Title>
      {error && <p className="rounded-xl bg-danger-50 text-danger-800 text-lg p-4">{error}</p>}

      <ul className="flex flex-col gap-2">
        {weeks.map(w => (
          <li key={w.start} className={`rounded-2xl border p-4 flex flex-wrap items-center gap-3 ${w.state === 'mine' ? 'bg-teal-50 border-teal-100' : w.state === 'loue' ? 'bg-gray-100 border-gray-100' : 'bg-white border-gray-200'}`}>
            <div className="flex-1 min-w-[200px]">
              <p className="text-lg font-medium text-gray-900 first-letter:uppercase">{longDate(w.start)}</p>
              <p className="text-base text-gray-600">au {longDate(w.end)}</p>
            </div>
            {w.state === 'libre' && <button type="button" onClick={() => setConfirm({ action: 'add', start: w.start, end: w.end })} className="btn-primary text-lg min-h-[52px] px-6 rounded-xl">Réserver</button>}
            {w.state === 'loue' && <span className="text-lg text-gray-500 px-2">{vis.locations ? 'Loué' : 'Indisponible'}</span>}
            {w.state === 'mine' && <>
              <span className="text-lg font-semibold text-teal-800 flex items-center gap-1.5"><Check size={20} /> Pour vous</span>
              <button type="button" onClick={() => { const b = getOwnerBlocks(owner.id).find(x => x.id === w.blockId); setConfirm({ action: 'remove', blockId: w.blockId, start: b.start, end: b.end }) }} className="btn-ghost text-base min-h-[48px] rounded-xl text-gray-700">Annuler</button>
            </>}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col gap-4">
        {!custom
          ? <button type="button" onClick={() => setCustom(true)} className="text-lg text-navy-600 font-medium text-left min-h-[48px]">Seulement quelques jours ? Choisir d'autres dates</button>
          : <>
            <p className="text-lg font-semibold text-gray-900">Choisir mes dates</p>
            <label className="text-lg text-gray-700">Je pars le
              <input type="date" min={TODAY} className="block w-full mt-1 text-lg border border-gray-300 rounded-xl px-3 min-h-[52px]" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
            </label>
            <label className="text-lg text-gray-700">Je rends le bateau le
              <input type="date" min={form.start || TODAY} className="block w-full mt-1 text-lg border border-gray-300 rounded-xl px-3 min-h-[52px]" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
            </label>
            <button type="button" disabled={!form.start || !form.end} onClick={() => setConfirm({ action: 'add', start: form.start, end: form.end })} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl disabled:opacity-40">Continuer</button>
          </>}
      </div>
    </div>
  )
}

// ── Demander un service : 1) quoi, 2) quand et précisions, 3) c'est envoyé ──
function Service({ back }) {
  const [type, setType] = useState(null)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const mine = getOwnerServices(owner.id)

  if (sent) return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-teal-50 border border-teal-100 p-6 flex flex-col items-center text-center gap-3">
        <span className="w-16 h-16 rounded-full bg-teal-400 flex items-center justify-center"><Check size={34} className="text-white" strokeWidth={3} /></span>
        <p className="text-xl text-teal-900 font-semibold">Votre demande est envoyée.</p>
        <p className="text-lg text-teal-800">Midi Nautisme va vous répondre. Vous verrez la réponse sur l'accueil.</p>
      </div>
      <button type="button" onClick={back} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl">Revenir à l'accueil</button>
    </div>
  )

  if (type) {
    const T = SERVICE_TYPES.find(t => t.id === type)
    return (
      <div className="flex flex-col gap-5">
        <BackButton onClick={() => setType(null)} />
        <Title>{T.label}</Title>
        <label className="text-lg text-gray-700">Pour quel jour ? <span className="text-gray-500">(si vous savez)</span>
          <input type="date" min={TODAY} className="block w-full mt-1 text-lg border border-gray-300 rounded-xl px-3 min-h-[52px] bg-white" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className="text-lg text-gray-700">Un détail à ajouter ? <span className="text-gray-500">(facultatif)</span>
          <textarea rows={3} className="block w-full mt-1 text-lg border border-gray-300 rounded-xl px-3 py-2 bg-white" placeholder="Par exemple : draps pour 6 personnes" value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <button type="button" onClick={() => { requestService(owner.id, type, date, note); setSent(true); window.scrollTo({ top: 0 }) }} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl">Envoyer ma demande</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <Title sub="Que voulez-vous demander ?">Demander un service</Title>
      <div className="flex flex-col gap-3">
        {SERVICE_TYPES.map(t => <BigButton key={t.id} tone="light" icon={SERVICE_ICONS[t.id]} title={t.label} sub={t.hint} onClick={() => setType(t.id)} />)}
      </div>
      {mine.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex flex-col gap-3">
          <p className="text-lg font-semibold text-gray-900">Mes demandes</p>
          {mine.map(s => (
            <div key={s.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
              <p className="text-lg text-gray-900">{serviceLabel(s.type)}{s.date && <span className="text-gray-600"> · {longDate(s.date)}</span>}</p>
              <p className={`text-base font-medium ${s.status === 'faite' ? 'text-teal-700' : s.status === 'refusee' ? 'text-danger-600' : 'text-amber-700'}`}>{SERVICE_STATUS[s.status]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Écrire à l'agence ──
function Messages({ back }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)
  const messages = getOwnerMessages(owner.id)
  useEffect(() => { markRead('owner', owner.id) }, [messages.length])
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, [messages.length])
  function submit(e) { e.preventDefault(); sendOwnerMessage(owner.id, 'owner', text); setText('') }
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <Title>Écrire à Midi Nautisme</Title>
      <div ref={listRef} className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-4">
        {messages.map(m => {
          const mine = m.from === 'owner'
          return (
            <div key={m.id} className={`max-w-[88%] px-4 py-3 rounded-2xl ${mine ? 'self-end bg-navy-600 text-white' : 'self-start bg-gray-100 text-gray-900'}`}>
              <p className="text-lg leading-snug">{m.text}</p>
              <p className={`text-sm mt-1 ${mine ? 'text-navy-50' : 'text-gray-500'}`}>{mine ? 'Vous' : 'Midi Nautisme'} · {m.date}</p>
            </div>
          )
        })}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-lg text-gray-700" htmlFor="owner-msg">Votre message</label>
        <textarea id="owner-msg" rows={3} className="w-full text-lg border border-gray-300 rounded-xl px-3 py-2 bg-white" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim()} className="btn-primary justify-center text-lg min-h-[56px] rounded-xl disabled:opacity-40">Envoyer</button>
      </form>
    </div>
  )
}

function Suivi({ back }) {
  const items = getBoatHistory(owner, 10)
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <Title sub="Les dernières interventions sur votre bateau.">Suivi de mon bateau</Title>
      <ul className="flex flex-col gap-2">
        {items.map(m => (
          <li key={m.key} className="rounded-2xl bg-white border border-gray-200 p-4 flex items-center gap-4">
            <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-teal-400' : 'bg-gray-200'}`}>{m.done && <Check size={22} className="text-white" strokeWidth={3} />}</span>
            <div>
              <p className="text-lg text-gray-900">{m.label}</p>
              <p className="text-base text-gray-500 first-letter:uppercase">{longDate(m.date)} · {m.by}</p>
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-lg text-gray-500">Rien pour l'instant.</p>}
      </ul>
    </div>
  )
}

function Revenus({ back }) {
  const r = getRevenue(owner, '2026')
  const Line = ({ label, value, strong }) => (
    <div className="flex items-baseline justify-between gap-4 py-3 border-t border-gray-100 first:border-0">
      <span className="text-lg text-gray-700">{label}</span>
      <span className={`text-xl ${strong ? 'font-bold text-gray-900' : 'text-gray-900'}`}>{value}</span>
    </div>
  )
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <Title sub="Pour l'année 2026.">Mes revenus</Title>
      <div className="rounded-2xl bg-white border border-gray-200 px-5 py-2">
        <Line label="Nombre de locations" value={r.count} />
        <Line label="Déjà gagné" value={eur(r.ownerPast)} />
        <Line label="À venir (déjà réservé)" value={eur(r.ownerUpcoming)} />
        <Line label="Total de l'année pour vous" value={eur(r.ownerTotal)} strong />
      </div>
      <p className="text-base text-gray-500">Votre part est de {Math.round(r.share * 100)} % du prix des locations, selon votre contrat avec Midi Nautisme. (Démo : montants fictifs.)</p>
    </div>
  )
}

export default function ProprietaireDashboard({ onLogout }) {
  const [screen, setScreen] = useState('home')
  const [, refresh] = useState(0)
  useEffect(() => subscribeOwner(() => refresh(v => v + 1)), [])
  const go = s => { setScreen(s); window.scrollTo({ top: 0 }) }
  const back = () => go('home')
  const vis = getVisibility(owner.id)
  getOwnerState() // abonné : chaque changement (par l'agence ou par lui) redessine l'écran

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-navy-900">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={back} className="font-display text-white text-xl font-bold tracking-tight">Hel<span className="text-teal-200">mo</span></button>
          <span className="text-sm text-navy-100">Mon bateau</span>
          <button type="button" onClick={onLogout} className="ml-auto flex items-center gap-2 min-h-[44px] px-3 rounded-lg text-base text-white hover:bg-navy-800"><LogOut size={18} /> Quitter</button>
        </div>
      </header>
      <p className="max-w-xl mx-auto px-4 pt-3 text-sm text-gray-500">Démo : propriétaire et données fictives.</p>
      <main className="max-w-xl mx-auto px-4 pt-3 pb-10">
        {screen === 'home' && <Home go={go} />}
        {screen === 'reserver' && <Reserver back={back} />}
        {screen === 'service' && <Service back={back} />}
        {screen === 'messages' && <Messages back={back} />}
        {screen === 'suivi' && (vis.suivi ? <Suivi back={back} /> : <Home go={go} />)}
        {screen === 'revenus' && (vis.revenus ? <Revenus back={back} /> : <Home go={go} />)}
      </main>
    </div>
  )
}
