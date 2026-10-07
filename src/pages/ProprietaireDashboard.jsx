// Espace propriétaire — DÉMO (décision du 07/10/2026), à tester avec Marie.
// Pour le propriétaire du bateau, souvent une personne âgée : simple ET soigné.
// Principes : le planning est un vrai calendrier (comme un agenda papier), on réserve en
// touchant le jour de départ puis le jour de retour ; textes lisibles, boutons nommés (jamais
// une icône seule), dates en toutes lettres, confirmation avant chaque engagement, « Retour » partout.
// Il voit tout sur SON bateau, sauf les locataires (il sait seulement que le bateau est loué).
// L'agence traite ses demandes dans son onglet « Propriétaires » (src/pages/GestionLocative.jsx).
// Logique : src/lib/owner-space.js.
import { useState, useEffect, useRef } from 'react'
import { Wrench, MessageCircle, ClipboardCheck, Euro, ArrowLeft, Check, Sparkles, Anchor, Hammer, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  DEMO_OWNER, SERVICE_TYPES, SERVICE_STATUS, TODAY, serviceLabel,
  subscribeOwner, getVisibility, getOwnerBoat, getBoatStatusToday, getDayState,
  getOwnerBlocks, addBlock, removeBlock, getRevenue, getBoatHistory, getOwnerServices, requestService,
  getOwnerMessages, sendOwnerMessage, getUnread, markRead,
} from '@/lib/owner-space'

const owner = DEMO_OWNER
const eur = n => n.toLocaleString('fr-FR') + ' €'
const longDate = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const nights = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const SERVICE_ICONS = { preparation: Anchor, menage: Sparkles, entretien: Wrench, sav: Hammer }
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="self-start flex items-center gap-2 min-h-[44px] pr-3 text-base font-medium text-navy-600 hover:text-navy-800">
      <ArrowLeft size={20} /> Retour
    </button>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ${className}`}>{children}</div>
}

function Done({ text, sub, onBack }) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="p-7 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center"><Check size={30} className="text-white" strokeWidth={3} /></span>
        <p className="text-xl font-semibold text-gray-900">{text}</p>
        {sub && <p className="text-base text-gray-600">{sub}</p>}
      </Card>
      <button type="button" onClick={onBack} className="btn-primary justify-center text-base min-h-[52px] rounded-xl">Revenir à mon bateau</button>
    </div>
  )
}

// ── Le calendrier du bateau : on voit, et on réserve en touchant les jours ──
// Le mois affiché est gardé par l'accueil : après une réservation, on revient au même mois.
function BoatCalendar({ month, setMonth, onReserved }) {
  const vis = getVisibility(owner.id)
  const [sel, setSel] = useState(null)       // { start, end? }
  const [focus, setFocus] = useState(null)   // jour touché qui n'est pas libre
  const [confirm, setConfirm] = useState(null) // { action, start, end, blockId }
  const [error, setError] = useState('')

  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const daysInMonth = new Date(y, m, 0).getDate()
  const offset = (new Date(first + 'T12:00:00').getDay() + 6) % 7 // lundi = 0
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const monthLabel = new Date(first + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const shiftMonth = n => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
  const canGoBack = month > TODAY.slice(0, 7)

  // Les jours entre le départ et la veille du retour doivent tous être libres.
  const rangeFree = (a, b) => { for (let d = a; d < b; d = addDays(d, 1)) if (getDayState(owner, d).state !== 'libre') return false; return true }

  function tap(day) {
    setError('')
    const { state, block } = getDayState(owner, day)
    if (state === 'passe') return
    if (state !== 'libre' && !(sel && !sel.end && day > sel.start)) { setSel(null); setFocus({ day, state, block }); return }
    setFocus(null)
    if (!sel || sel.end) { setSel({ start: day }); return }
    if (day <= sel.start) { setSel({ start: day }); return }
    if (!rangeFree(sel.start, day)) { setError('Votre bateau n\'est pas libre sur toute cette période. Choisissez d\'autres dates.'); setSel(null); return }
    setSel({ start: sel.start, end: day })
  }

  const inSel = d => sel && (sel.end ? d >= sel.start && d <= sel.end : d === sel.start)
  // Raccourci : un samedi libre → toute la semaine (rotation samedi → samedi).
  const weekShortcut = sel && !sel.end && new Date(sel.start + 'T12:00:00').getDay() === 6 && rangeFree(sel.start, addDays(sel.start, 7))

  function validate() {
    if (confirm.action === 'remove') { removeBlock(confirm.blockId); onReserved('remove', confirm) }
    else {
      const res = addBlock(owner.id, confirm.start, confirm.end)
      if (!res.ok) { setError(res.error); setConfirm(null); return }
      onReserved('add', confirm)
    }
    setConfirm(null); setSel(null); setFocus(null)
  }

  if (confirm) return (
    <Card className="p-6 flex flex-col gap-5">
      <p className="font-display text-xl font-bold text-gray-900">{confirm.action === 'add' ? 'Vous confirmez ?' : 'Annuler cette réservation ?'}</p>
      <p className="text-lg text-gray-800 leading-relaxed">
        {confirm.action === 'add'
          ? <>Vous gardez votre bateau <strong>du {longDate(confirm.start)}</strong> <strong>au {longDate(confirm.end)}</strong>. Il ne sera pas loué ces jours-là.</>
          : <>Votre bateau pourra de nouveau être loué du {longDate(confirm.start)} au {longDate(confirm.end)}.</>}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={validate} className="btn-primary justify-center text-base min-h-[52px] rounded-xl flex-1"><Check size={20} /> {confirm.action === 'add' ? 'Oui, je réserve' : 'Oui, j\'annule'}</button>
        <button type="button" onClick={() => setConfirm(null)} className="btn-ghost justify-center text-base min-h-[52px] rounded-xl flex-1 text-gray-700">Non, revenir</button>
      </div>
    </Card>
  )

  return (
    <Card className="p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shiftMonth(-1)} disabled={!canGoBack} className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-30" aria-label="Mois précédent"><ChevronLeft size={22} /></button>
        <p className="flex-1 text-center font-display text-lg font-bold text-gray-900 first-letter:uppercase">{monthLabel}</p>
        <button type="button" onClick={() => shiftMonth(1)} className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50" aria-label="Mois suivant"><ChevronRight size={22} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(w => <p key={w} className={`text-center text-xs font-semibold uppercase tracking-wide pb-1 ${w === 'Sam' ? 'text-navy-600' : 'text-gray-400'}`}>{w}</p>)}
        {cells.map((d, i) => {
          if (!d) return <span key={'e' + i} />
          const { state } = getDayState(owner, d)
          const selected = inSel(d)
          const past = d < TODAY
          const cls = selected
            ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-400'
            : state === 'mine' ? 'bg-teal-400 text-white'
              : state === 'loue' ? 'bg-navy-600 text-white'
                : past ? 'text-gray-300'
                  : 'bg-gray-50 text-gray-900 hover:bg-amber-50'
          return (
            <button key={d} type="button" onClick={() => tap(d)} disabled={past && state !== 'mine' && state !== 'loue'}
              aria-label={`${longDate(d)} : ${state === 'mine' ? 'réservé pour vous' : state === 'loue' ? (vis.locations ? 'loué' : 'indisponible') : past ? 'passé' : 'libre'}`}
              className={`h-12 sm:h-14 rounded-lg text-base font-medium flex items-center justify-center transition-colors ${cls} ${past && !selected ? 'opacity-50' : ''} ${d === TODAY ? 'outline outline-2 outline-offset-1 outline-gray-900' : ''}`}>
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-navy-600" />{vis.locations ? 'Loué' : 'Indisponible'}</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-teal-400" />Pour vous</span>
        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />Libre</span>
      </div>

      {error && <p className="rounded-xl bg-danger-50 text-danger-800 text-base p-3">{error}</p>}

      {/* Ce qui se passe après un toucher : une seule boîte, toujours au même endroit. */}
      <div className="rounded-xl bg-gray-50 p-4">
        {!sel && !focus && <p className="text-base text-gray-700">Pour naviguer sur votre bateau : <strong>touchez le jour de départ</strong>, puis le jour de retour.</p>}

        {sel && !sel.end && (
          <div className="flex flex-col gap-3">
            <p className="text-base text-gray-800">Départ le <strong>{longDate(sel.start)}</strong>. Touchez maintenant le <strong>jour de retour</strong>.</p>
            <div className="flex flex-wrap gap-2">
              {weekShortcut && <button type="button" onClick={() => setConfirm({ action: 'add', start: sel.start, end: addDays(sel.start, 7) })} className="btn-primary text-base min-h-[48px] rounded-xl">Toute la semaine, jusqu'au samedi suivant</button>}
              <button type="button" onClick={() => setSel(null)} className="btn-ghost text-base min-h-[48px] rounded-xl text-gray-700"><X size={18} /> Effacer</button>
            </div>
          </div>
        )}

        {sel?.end && (
          <div className="flex flex-col gap-3">
            <p className="text-base text-gray-800">Du <strong>{longDate(sel.start)}</strong> au <strong>{longDate(sel.end)}</strong> · {nights(sel.start, sel.end)} nuit{nights(sel.start, sel.end) > 1 ? 's' : ''}.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setConfirm({ action: 'add', start: sel.start, end: sel.end })} className="btn-primary text-base min-h-[48px] rounded-xl">Réserver ces dates</button>
              <button type="button" onClick={() => setSel(null)} className="btn-ghost text-base min-h-[48px] rounded-xl text-gray-700"><X size={18} /> Effacer</button>
            </div>
          </div>
        )}

        {focus?.state === 'mine' && (
          <div className="flex flex-col gap-3">
            <p className="text-base text-gray-800">Votre bateau est réservé pour vous du <strong>{longDate(focus.block.start)}</strong> au <strong>{longDate(focus.block.end)}</strong>.</p>
            {focus.block.start >= TODAY && <button type="button" onClick={() => setConfirm({ action: 'remove', blockId: focus.block.id, start: focus.block.start, end: focus.block.end })} className="btn-ghost self-start text-base min-h-[48px] rounded-xl text-gray-700">Annuler cette réservation</button>}
          </div>
        )}
        {focus?.state === 'loue' && <p className="text-base text-gray-800">Le {longDate(focus.day)}, votre bateau est {vis.locations ? 'loué' : 'indisponible'}. Pour en parler, écrivez à l'agence.</p>}
      </div>
    </Card>
  )
}

// ── Accueil = mon bateau ──
function Home({ go }) {
  const boat = getOwnerBoat()
  const vis = getVisibility(owner.id)
  const status = getBoatStatusToday()
  const unread = getUnread('owner', owner.id)
  const [done, setDone] = useState(null)
  const [month, setMonth] = useState(TODAY.slice(0, 7)) // 'AAAA-MM'
  const openRequests = getOwnerServices(owner.id).filter(s => s.status === 'envoyee' || s.status === 'acceptee')
  const statusText = status.kind === 'mine' ? `À vous jusqu'au ${longDate(status.until)}`
    : status.kind === 'loue' ? `${vis.locations ? 'Loué' : 'Occupé'} jusqu'au ${longDate(status.until)}`
      : 'Au port, disponible'

  if (done) return <Done text={done.action === 'add' ? 'C\'est noté, votre bateau est à vous.' : 'Votre réservation est annulée.'}
    sub={done.action === 'add' ? `Du ${longDate(done.start)} au ${longDate(done.end)}. L'agence est prévenue.` : 'Le bateau peut de nouveau être loué ces jours-là.'}
    onBack={() => setDone(null)} />

  const Tile = ({ icon: Icon, title, sub, onClick, badge }) => (
    <button type="button" onClick={onClick} className="relative flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:border-navy-200 text-left min-h-[120px]">
      <span className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center"><Icon size={22} className="text-navy-600" /></span>
      <span>
        <span className="block text-base font-semibold text-gray-900 leading-snug">{title}</span>
        {sub && <span className="block text-sm text-gray-500 mt-0.5">{sub}</span>}
      </span>
      {badge > 0 && <span className="absolute top-3 right-3 min-w-[24px] h-6 px-2 rounded-full bg-danger-400 text-white text-sm font-bold flex items-center justify-center">{badge}</span>}
    </button>
  )

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-base text-gray-500">Bonjour {owner.firstName},</p>
        <h1 className="font-display text-2xl font-bold text-gray-900">{boat.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${status.kind === 'port' ? 'bg-gray-100 text-gray-700' : status.kind === 'mine' ? 'bg-teal-50 text-teal-800' : 'bg-navy-50 text-navy-800'}`}>
            <span className={`w-2 h-2 rounded-full ${status.kind === 'port' ? 'bg-gray-400' : status.kind === 'mine' ? 'bg-teal-400' : 'bg-navy-600'}`} />{statusText}
          </span>
          <span className="text-sm text-gray-500">{boat.port} · géré par Midi Nautisme</span>
        </div>
      </div>

      <BoatCalendar month={month} setMonth={setMonth} onReserved={(action, c) => { setDone({ action, ...c }); window.scrollTo({ top: 0 }) }} />

      <div className="grid grid-cols-2 gap-3">
        <Tile icon={Wrench} title="Demander un service" sub="Préparation, ménage, réparation…" onClick={() => go('service')} />
        <Tile icon={MessageCircle} title="Écrire à l'agence" sub="Midi Nautisme" onClick={() => go('messages')} badge={unread} />
        {vis.suivi && <Tile icon={ClipboardCheck} title="Suivi du bateau" sub="Ce qui a été fait" onClick={() => go('suivi')} />}
        {vis.revenus && <Tile icon={Euro} title="Mes revenus" sub="Saison 2026" onClick={() => go('revenus')} />}
      </div>

      {openRequests.length > 0 && (
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-base font-semibold text-gray-900">Mes demandes en cours</p>
          {openRequests.map(s => (
            <div key={s.id} className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.status === 'acceptee' ? 'bg-teal-400' : 'bg-amber-200'}`} />
              <p className="text-base text-gray-800 flex-1">{serviceLabel(s.type)}{s.date && <span className="text-gray-500"> · {longDate(s.date)}</span>}</p>
              <p className="text-sm text-gray-500 text-right">{s.status === 'acceptee' ? 'Acceptée' : 'En attente'}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── Demander un service : quoi, puis quand et précisions, puis c'est envoyé ──
function Service({ back }) {
  const [type, setType] = useState(null)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const mine = getOwnerServices(owner.id)

  if (sent) return <Done text="Votre demande est envoyée." sub="Midi Nautisme va vous répondre. Vous verrez la réponse sur votre page." onBack={back} />

  if (type) {
    const T = SERVICE_TYPES.find(t => t.id === type)
    return (
      <div className="flex flex-col gap-5">
        <BackButton onClick={() => setType(null)} />
        <h1 className="font-display text-2xl font-bold text-gray-900">{T.label}</h1>
        <Card className="p-5 flex flex-col gap-4">
          <label className="text-base font-medium text-gray-800">Pour quel jour ? <span className="font-normal text-gray-500">(si vous savez)</span>
            <input type="date" min={TODAY} className="block w-full mt-1.5 text-base border border-gray-300 rounded-xl px-3 min-h-[50px] bg-white" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label className="text-base font-medium text-gray-800">Un détail à ajouter ? <span className="font-normal text-gray-500">(facultatif)</span>
            <textarea rows={3} className="block w-full mt-1.5 text-base border border-gray-300 rounded-xl px-3 py-2.5 bg-white" placeholder="Par exemple : draps pour 6 personnes" value={note} onChange={e => setNote(e.target.value)} />
          </label>
        </Card>
        <button type="button" onClick={() => { requestService(owner.id, type, date, note); setSent(true); window.scrollTo({ top: 0 }) }} className="btn-primary justify-center text-base min-h-[52px] rounded-xl">Envoyer ma demande</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Demander un service</h1>
        <p className="text-base text-gray-600 mt-1">Que souhaitez-vous ?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SERVICE_TYPES.map(t => {
          const Icon = SERVICE_ICONS[t.id]
          return (
            <button key={t.id} type="button" onClick={() => setType(t.id)} className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:border-navy-200 text-left min-h-[120px]">
              <span className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center"><Icon size={22} className="text-navy-600" /></span>
              <span><span className="block text-base font-semibold text-gray-900">{t.label}</span><span className="block text-sm text-gray-500 mt-0.5">{t.hint}</span></span>
            </button>
          )
        })}
      </div>
      {mine.length > 0 && (
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-base font-semibold text-gray-900">Mes demandes</p>
          {mine.map(s => (
            <div key={s.id} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
              <p className="text-base text-gray-900">{serviceLabel(s.type)}{s.date && <span className="text-gray-500"> · {longDate(s.date)}</span>}</p>
              <p className={`text-sm font-medium ${s.status === 'faite' ? 'text-teal-700' : s.status === 'refusee' ? 'text-danger-600' : 'text-amber-600'}`}>{SERVICE_STATUS[s.status]}</p>
            </div>
          ))}
        </Card>
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
      <h1 className="font-display text-2xl font-bold text-gray-900">Midi Nautisme</h1>
      <Card className="p-4">
        <div ref={listRef} className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
          {messages.map(m => {
            const mine = m.from === 'owner'
            return (
              <div key={m.id} className={`max-w-[85%] px-4 py-3 rounded-2xl ${mine ? 'self-end bg-navy-600 text-white rounded-br-md' : 'self-start bg-gray-100 text-gray-900 rounded-bl-md'}`}>
                <p className="text-base leading-snug">{m.text}</p>
                <p className={`text-xs mt-1 ${mine ? 'text-navy-50' : 'text-gray-500'}`}>{mine ? 'Vous' : 'Midi Nautisme'} · {m.date}</p>
              </div>
            )
          })}
        </div>
      </Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-base font-medium text-gray-800" htmlFor="owner-msg">Votre message</label>
        <textarea id="owner-msg" rows={3} className="w-full text-base border border-gray-300 rounded-xl px-3 py-2.5 bg-white" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim()} className="btn-primary justify-center text-base min-h-[52px] rounded-xl disabled:opacity-40">Envoyer</button>
      </form>
    </div>
  )
}

function Suivi({ back }) {
  const items = getBoatHistory(owner, 10)
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Suivi du bateau</h1>
        <p className="text-base text-gray-600 mt-1">Les dernières interventions.</p>
      </div>
      <Card className="divide-y divide-gray-100">
        {items.map(m => (
          <div key={m.key} className="p-4 flex items-center gap-4">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-teal-50' : 'bg-gray-100'}`}>{m.done && <Check size={18} className="text-teal-600" strokeWidth={3} />}</span>
            <div>
              <p className="text-base text-gray-900">{m.label}</p>
              <p className="text-sm text-gray-500 first-letter:uppercase">{longDate(m.date)} · {m.by}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-base text-gray-500">Rien pour l'instant.</p>}
      </Card>
    </div>
  )
}

function Revenus({ back }) {
  const r = getRevenue(owner, '2026')
  return (
    <div className="flex flex-col gap-5">
      <BackButton onClick={back} />
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Mes revenus</h1>
        <p className="text-base text-gray-600 mt-1">Saison 2026 · {r.count} locations</p>
      </div>
      <Card className="p-6">
        <p className="text-sm text-gray-500">Total de l'année pour vous</p>
        <p className="font-display text-4xl font-bold text-gray-900 mt-1">{eur(r.ownerTotal)}</p>
        <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div><p className="text-sm text-gray-500">Déjà gagné</p><p className="text-xl font-semibold text-gray-900">{eur(r.ownerPast)}</p></div>
          <div><p className="text-sm text-gray-500">À venir</p><p className="text-xl font-semibold text-gray-900">{eur(r.ownerUpcoming)}</p></div>
        </div>
      </Card>
      <p className="text-sm text-gray-500">Votre part : {Math.round(r.share * 100)} % du prix des locations, selon votre contrat avec Midi Nautisme. (Démo : montants fictifs.)</p>
    </div>
  )
}

export default function ProprietaireDashboard({ onLogout }) {
  const [screen, setScreen] = useState('home')
  const [, refresh] = useState(0)
  useEffect(() => subscribeOwner(() => refresh(v => v + 1)), []) // ce que fait l'agence s'affiche tout de suite
  const go = s => { setScreen(s); window.scrollTo({ top: 0 }) }
  const back = () => go('home')
  const vis = getVisibility(owner.id)

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-gray-900">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button type="button" onClick={back} className="font-display text-xl font-bold tracking-tight text-navy-900">Hel<span className="text-teal-400">mo</span></button>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-600">{owner.name}</span>
            <span className="w-9 h-9 rounded-full bg-navy-50 text-navy-800 text-sm font-bold flex items-center justify-center">{owner.initials}</span>
            <button type="button" onClick={onLogout} className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-sm text-gray-600 hover:bg-gray-100"><LogOut size={16} /> Quitter</button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 pt-5 pb-12">
        <p className="text-xs text-gray-400 mb-3">Démo : propriétaire et données fictives.</p>
        {screen === 'home' && <Home go={go} />}
        {screen === 'service' && <Service back={back} />}
        {screen === 'messages' && <Messages back={back} />}
        {screen === 'suivi' && (vis.suivi ? <Suivi back={back} /> : <Home go={go} />)}
        {screen === 'revenus' && (vis.revenus ? <Revenus back={back} /> : <Home go={go} />)}
      </main>
    </div>
  )
}
