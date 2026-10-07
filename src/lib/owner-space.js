// Espace propriétaire — DÉMO UNIQUEMENT (décision du 07/10/2026, à tester avec Marie).
//
// Idée : le loueur vend ses services (préparation, ménage, entretien, SAV…) aux propriétaires
// des bateaux qu'il gère. Helmo est son outil : le propriétaire voit SON bateau, bloque ses
// dates d'usage, demande des services, suit ses revenus et échange avec le loueur.
// Le loueur choisit ce que le propriétaire voit (réglages de visibilité ci-dessous).
//
// Tout ce fichier vit en mémoire (un rechargement efface tout). En production :
// - propriétaires = table dédiée, reliée aux bateaux avec leurs parts (copropriété) ;
// - dates bloquées = période « usage propriétaire » dans le planning, avec la MÊME règle
//   anti-chevauchement que les locations (R1 des specs) ;
// - demandes de services = des missions (même table, nouveaux types) ;
// - messages = fil propriétaire ↔ loueur, distinct du fil interne de l'agence.
// Pas de données constructeur (apps des chantiers) : hors périmètre pour l'instant.

import { BOATS, BOOKINGS } from './mock-data'
import { computeRentalPrice } from './invoice'
import { buildAllMissions } from './tech-missions'
import { buildAllMenageMissions } from './menage-missions'
import { getState } from './shared-state'

export const TODAY = '2026-07-04'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
// Deux périodes [début, fin) se chevauchent-elles ? Une sortie d'un jour occupe sa journée entière.
const endOf = p => (p.start === p.end ? addDays(p.end, 1) : p.end)
const overlaps = (a, b) => a.start < endOf(b) && b.start < endOf(a)

// ── Propriétaire de démo (fictif) ─────────────────────────────────────
export const DEMO_OWNER = {
  id: 'owner-1',
  name: 'Philippe Arnaud',
  initials: 'PA',
  email: 'p.arnaud@email.com',
  boatId: 'mn-6', // Fountaine Pajot 460 — L'After, en gestion locative chez Midi Nautisme
  // Part reversée au propriétaire sur les locations : HYPOTHÈSE DE DÉMO, le vrai taux
  // dépend du contrat de gestion de chaque loueur (question à poser à Marie).
  ownerShare: 0.7,
}

export const SERVICE_TYPES = [
  { id: 'preparation', label: 'Préparation avant ma sortie' },
  { id: 'menage', label: 'Ménage' },
  { id: 'entretien', label: 'Entretien' },
  { id: 'sav', label: 'SAV / réparation' },
]

export const VISIBILITY_ITEMS = [
  { id: 'planning', label: 'Planning du bateau', hint: 'Locations (sans nom de client) et dates bloquées' },
  { id: 'services', label: 'Demandes de services', hint: 'Le propriétaire peut demander préparation, ménage, entretien, SAV' },
  { id: 'revenus', label: 'Revenus de location', hint: 'Montants des locations et part du propriétaire' },
  { id: 'missions', label: 'Missions faites sur le bateau', hint: 'Check-in, check-out, ménages réalisés' },
  { id: 'messages', label: 'Messages', hint: 'Fil propriétaire ↔ loueur (le fil interne de l\'agence reste privé)' },
]

const firstFreeWeek = (from) => {
  // Première semaine samedi → samedi libre à partir de « from » : sert à placer les dates
  // bloquées de démo sans tomber sur une location générée.
  let s = from
  for (let i = 0; i < 40; i++) {
    const p = { start: s, end: addDays(s, 7) }
    if (!BOOKINGS.some(b => b.boatId === DEMO_OWNER.boatId && overlaps(b, p))) return p
    s = addDays(s, 7)
  }
  return null
}

let state = {
  visibility: Object.fromEntries(VISIBILITY_ITEMS.map(v => [v.id, true])),
  blocks: [],
  services: [
    { id: 'srv-1', type: 'entretien', date: '2026-04-11', note: 'Antifouling et révision moteurs avant saison', status: 'faite', createdAt: '2026-03-02' },
    { id: 'srv-2', type: 'preparation', date: null, note: '', status: 'envoyee', createdAt: '2026-07-02' },
  ],
  messages: [
    { id: 'om-1', from: 'agency', text: "Bonjour M. Arnaud, l'antifouling est terminé, le bateau est prêt pour la saison.", date: '12 avril' },
    { id: 'om-2', from: 'owner', text: 'Merci ! Je bloque une semaine en septembre pour naviguer en famille.', date: '28 juin' },
    { id: 'om-3', from: 'agency', text: 'Bien noté, la semaine est retirée de la vente. Bonne navigation !', date: '28 juin' },
  ],
}
{
  // Dates bloquées de démo : une semaine en septembre, un week-end en octobre.
  const sept = firstFreeWeek('2026-09-05')
  if (sept) state.blocks.push({ id: 'blk-1', ...sept, label: 'Semaine en famille' })
  const oct = firstFreeWeek('2026-10-10')
  if (oct) state.blocks.push({ id: 'blk-2', start: oct.start, end: addDays(oct.start, 2), label: 'Week-end' })
  // La demande de préparation en attente porte sur la première date bloquée.
  if (sept) state.services[1] = { ...state.services[1], date: sept.start, note: 'Pleins faits et draps pour 6 personnes' }
}

let listeners = []
const notify = () => listeners.forEach(fn => fn(state))
const update = patch => { state = { ...state, ...patch }; notify() }

export function subscribeOwner(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
export function getOwnerState() { return state }

// ── Visibilité : décidée par le loueur ───────────────────────────────
export function setVisibility(id, value) {
  update({ visibility: { ...state.visibility, [id]: value } })
}

// ── Le bateau et son planning ────────────────────────────────────────
export function getOwnerBoat() {
  return BOATS.find(b => b.id === DEMO_OWNER.boatId)
}

// Locations du bateau, SANS les données des clients (minimisation RGPD : le propriétaire
// n'a pas à connaître le nom ni le téléphone des locataires).
export function getBoatRentals() {
  return BOOKINGS
    .filter(b => b.boatId === DEMO_OWNER.boatId)
    .map(b => ({ id: b.id, start: b.start, end: b.end, amount: computeRentalPrice(b) || 0 }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Bloquer des dates : refusé si elles chevauchent une location ou un autre blocage,
// ou si elles sont déjà passées. Retourne { ok, error }.
export function addBlock(start, end, label) {
  if (!start || !end) return { ok: false, error: 'Choisis une date de début et une date de fin.' }
  if (end < start) return { ok: false, error: 'La fin doit être après le début.' }
  if (start < TODAY) return { ok: false, error: 'Ces dates sont déjà passées.' }
  const p = { start, end } // même convention que les locations : jour de fin = jour de rendu
  if (getBoatRentals().some(r => overlaps(r, p))) return { ok: false, error: 'Le bateau est déjà loué sur une partie de ces dates. Contacte le loueur.' }
  if (state.blocks.some(b => overlaps(b, p))) return { ok: false, error: 'Tu as déjà bloqué une partie de ces dates.' }
  update({ blocks: [...state.blocks, { id: 'blk-' + Date.now(), start, end, label: label || 'Usage propriétaire' }].sort((a, b) => a.start.localeCompare(b.start)) })
  return { ok: true }
}
export function removeBlock(id) {
  update({ blocks: state.blocks.filter(b => b.id !== id) })
}

// ── Revenus ─────────────────────────────────────────────────────────
// Saison 2026 : locations passées (encaissées) et à venir (réservées).
export function getRevenue(year = '2026') {
  const rentals = getBoatRentals().filter(r => r.start.startsWith(year))
  const sumOf = list => list.reduce((n, r) => n + r.amount, 0)
  const past = rentals.filter(r => r.start < TODAY)
  const upcoming = rentals.filter(r => r.start >= TODAY)
  const gross = sumOf(rentals)
  const byMonth = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    return sumOf(rentals.filter(r => r.start.slice(5, 7) === m))
  })
  return {
    weeks: rentals.length,
    gross,
    past: sumOf(past),
    upcoming: sumOf(upcoming),
    ownerPart: Math.round(gross * DEMO_OWNER.ownerShare),
    ownerPast: Math.round(sumOf(past) * DEMO_OWNER.ownerShare),
    byMonth,
  }
}

// ── Missions faites sur le bateau ───────────────────────────────────
// Check-in / check-out des techniciens et ménages de la société, passés. Sans nom de client.
export function getBoatMissions(limit = 10) {
  const st = getState()
  const tech = buildAllMissions()
    .filter(m => m.boatId === DEMO_OWNER.boatId && m.date < TODAY)
    .map(m => ({
      key: m.key, date: m.date,
      label: m.type === 'depart' ? 'Check-in (départ client)' : 'Check-out (retour client)',
      by: 'Technicien Midi Nautisme',
      done: m.type === 'depart' ? !!st.checkIns?.[m.bookingId]?.done : true, // démo : retours passés considérés faits
    }))
  const menage = buildAllMenageMissions()
    .filter(m => m.boatId === DEMO_OWNER.boatId && m.date < TODAY)
    .map(m => ({ key: m.key, date: m.date, label: 'Ménage fin de location', by: m.providerName, done: !!m.done }))
  const services = state.services
    .filter(s => s.status === 'faite' && s.date)
    .map(s => ({ key: s.id, date: s.date, label: SERVICE_TYPES.find(t => t.id === s.type)?.label || 'Service', by: 'Midi Nautisme', done: true }))
  return [...tech, ...menage, ...services].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

// ── Demandes de services ────────────────────────────────────────────
// Cycle : envoyee → acceptee → faite (ou refusee). Le prix est fixé par le loueur, hors démo.
export function requestService(type, date, note) {
  update({ services: [{ id: 'srv-' + Date.now(), type, date: date || null, note: note || '', status: 'envoyee', createdAt: TODAY }, ...state.services] })
}
export function setServiceStatus(id, status) {
  update({ services: state.services.map(s => (s.id === id ? { ...s, status } : s)) })
}

// ── Messages propriétaire ↔ loueur ──────────────────────────────────
export function sendOwnerMessage(from, text) {
  if (!text.trim()) return
  update({ messages: [...state.messages, { id: 'om-' + Date.now(), from, text: text.trim(), date: "Aujourd'hui" }] })
}
