// Gestion locative : le lien entre le PROPRIÉTAIRE d'un bateau et l'AGENCE qui le gère.
// DÉMO UNIQUEMENT (décision du 07/10/2026, à tester avec Marie).
//
// Deux espaces branchés sur ces mêmes données :
// - l'espace propriétaire (connexion « Propriétaire ») : voir son bateau, le réserver pour soi,
//   demander un service, écrire à l'agence ;
// - l'onglet « Propriétaires » de l'agence : traiter les demandes, répondre, choisir ce que
//   le propriétaire voit. Les demandes en attente remontent aussi dans « À traiter ».
// Ce que fait l'un apparaît tout de suite chez l'autre (dans la démo : même navigateur).
//
// Règles :
// - le propriétaire ne voit JAMAIS les données des locataires (nom, téléphone) : il sait
//   seulement que son bateau est loué (minimisation RGPD) ;
// - ses dates réservées ne peuvent pas chevaucher une location (même règle que R1 des specs) ;
// - réserver son bateau, demander un service et écrire à l'agence sont toujours possibles ;
//   l'agence choisit seulement ce qu'il VOIT (locations, revenus, suivi du bateau).
//
// Tout vit en mémoire (un rechargement efface tout). En production : propriétaires = table
// dédiée (un ou plusieurs par bateau, avec leurs parts), dates réservées = période « usage
// propriétaire » du planning, demandes = missions, messages = fil séparé du fil interne.
// Pas de données constructeur pour l'instant.

import { BOATS, BOOKINGS } from './mock-data'
import { computeRentalPrice } from './invoice'
import { buildAllMissions } from './tech-missions'
import { buildAllMenageMissions } from './menage-missions'
import { getState } from './shared-state'

export const TODAY = '2026-07-04'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
// Périodes [début, fin) : le jour de fin est le jour où l'on rend le bateau.
// Une sortie d'un jour occupe sa journée entière.
const endOf = p => (p.start === p.end ? addDays(p.end, 1) : p.end)
const overlaps = (a, b) => a.start < endOf(b) && b.start < endOf(a)

// ── Propriétaires de démo (fictifs) ───────────────────────────────────
// Une liste, même avec un seul propriétaire : l'agence en aura plusieurs.
export const OWNERS = [
  {
    id: 'owner-1',
    firstName: 'Philippe',
    name: 'Philippe Arnaud',
    initials: 'PA',
    email: 'p.arnaud@email.com',
    phone: '06 12 48 90 33',
    boatId: 'mn-6', // Fountaine Pajot 460 — L'After
    // Part reversée au propriétaire : HYPOTHÈSE DE DÉMO, fixée en vrai par le contrat de gestion.
    ownerShare: 0.7,
  },
]
export const DEMO_OWNER = OWNERS[0]
export const getOwnerBoat = (owner = DEMO_OWNER) => BOATS.find(b => b.id === owner.boatId)

export const SERVICE_TYPES = [
  { id: 'preparation', label: 'Préparer le bateau', hint: 'Avant que je parte naviguer' },
  { id: 'menage', label: 'Faire le ménage', hint: 'Nettoyage complet' },
  { id: 'entretien', label: 'Entretien', hint: 'Révision, carénage…' },
  { id: 'sav', label: 'Réparer quelque chose', hint: 'Une panne, un problème' },
]
export const serviceLabel = id => SERVICE_TYPES.find(t => t.id === id)?.label || 'Service'

export const SERVICE_STATUS = {
  envoyee: 'Envoyée, en attente de réponse',
  acceptee: 'Acceptée par l\'agence',
  faite: 'Faite',
  refusee: 'Refusée',
}

// Ce que l'agence peut montrer ou cacher. Le reste (réserver, demander, écrire) est toujours là.
export const VISIBILITY_ITEMS = [
  { id: 'locations', label: 'Les semaines où le bateau est loué', hint: 'Sans aucun nom de locataire. Si caché : « indisponible ».' },
  { id: 'revenus', label: 'Les revenus de location', hint: 'Montant des locations et part du propriétaire' },
  { id: 'suivi', label: 'Le suivi du bateau', hint: 'Check-in, check-out, ménages, entretiens faits' },
]

let state = {
  // Visibilité réglée par l'agence, par propriétaire.
  visibility: Object.fromEntries(OWNERS.map(o => [o.id, Object.fromEntries(VISIBILITY_ITEMS.map(v => [v.id, true]))])),
  blocks: [],     // { id, ownerId, start, end, label, createdAt }
  services: [],   // { id, ownerId, type, date, note, status, createdAt }
  messages: [],   // { id, ownerId, from: 'owner' | 'agency', text, date }
  // Messages pas encore lus, de chaque côté : ownerId -> nombre.
  unread: { agency: {}, owner: {} },
}

// ── Données de démo ───────────────────────────────────────────────────
{
  const o = DEMO_OWNER
  const firstFreeWeek = from => {
    let s = from
    for (let i = 0; i < 40; i++) {
      const p = { start: s, end: addDays(s, 7) }
      if (!BOOKINGS.some(b => b.boatId === o.boatId && overlaps(b, p))) return p
      s = addDays(s, 7)
    }
    return null
  }
  const sept = firstFreeWeek('2026-09-05')
  if (sept) state.blocks.push({ id: 'blk-1', ownerId: o.id, ...sept, label: 'Semaine en famille', createdAt: '2026-06-28' })
  state.services.push(
    { id: 'srv-1', ownerId: o.id, type: 'entretien', date: '2026-04-11', note: 'Antifouling et révision des moteurs avant la saison', status: 'faite', createdAt: '2026-03-02' },
    { id: 'srv-2', ownerId: o.id, type: 'preparation', date: sept?.start || null, note: 'Pleins faits et draps pour 6 personnes', status: 'envoyee', createdAt: '2026-07-02' },
  )
  state.messages.push(
    { id: 'om-1', ownerId: o.id, from: 'agency', text: "Bonjour M. Arnaud, l'antifouling est terminé. Le bateau est prêt pour la saison.", date: '12 avril' },
    { id: 'om-2', ownerId: o.id, from: 'owner', text: 'Merci ! Je garde une semaine en septembre pour naviguer en famille.', date: '28 juin' },
    { id: 'om-3', ownerId: o.id, from: 'agency', text: 'Bien noté, cette semaine n\'est plus proposée à la location. Bonne navigation !', date: '28 juin' },
    { id: 'om-4', ownerId: o.id, from: 'owner', text: 'Pourriez-vous faire préparer le bateau pour ma semaine de septembre ? Je vous ai envoyé la demande.', date: '2 juillet' },
  )
  state.unread.agency[o.id] = 1
}

let listeners = []
const notify = () => listeners.forEach(fn => fn(state))
const update = patch => { state = { ...state, ...patch }; notify() }
export function subscribeOwner(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
export function getOwnerState() { return state }

// ── Visibilité (réglée par l'agence) ─────────────────────────────────
export const getVisibility = ownerId => state.visibility[ownerId] || {}
export function setVisibility(ownerId, id, value) {
  update({ visibility: { ...state.visibility, [ownerId]: { ...getVisibility(ownerId), [id]: value } } })
}

// ── Locations du bateau, sans aucune donnée de locataire ─────────────
export function getBoatRentals(boatId = DEMO_OWNER.boatId) {
  return BOOKINGS
    .filter(b => b.boatId === boatId)
    .map(b => ({ id: b.id, start: b.start, end: b.end, amount: computeRentalPrice(b) || 0 }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Ce que fait le bateau aujourd'hui, en une phrase (accueil du propriétaire).
export function getBoatStatusToday(owner = DEMO_OWNER) {
  const rental = getBoatRentals(owner.boatId).find(r => r.start <= TODAY && TODAY < endOf(r))
  const mine = getOwnerBlocks(owner.id).find(b => b.start <= TODAY && TODAY < endOf(b))
  if (mine) return { kind: 'mine', until: mine.end }
  if (rental) return { kind: 'loue', until: rental.end }
  return { kind: 'port' }
}

// ── Semaines à venir, pour réserver son bateau ───────────────────────
// Les semaines suivent la rotation du loueur : samedi → samedi.
export function getUpcomingWeeks(owner = DEMO_OWNER, count = 16) {
  const d = new Date(TODAY + 'T12:00:00Z')
  const toSat = (6 - d.getUTCDay() + 7) % 7
  const first = addDays(TODAY, toSat === 0 ? 7 : toSat) // prochain samedi
  const rentals = getBoatRentals(owner.boatId)
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(first, i * 7)
    const p = { start, end: addDays(start, 7) }
    const block = getOwnerBlocks(owner.id).find(b => overlaps(b, p))
    const rented = rentals.some(r => overlaps(r, p))
    return { ...p, state: block ? 'mine' : rented ? 'loue' : 'libre', blockId: block?.id || null }
  })
}

// État d'un jour pour le calendrier du propriétaire : 'passe' | 'mine' | 'loue' | 'libre'.
// Un jour est occupé du jour de départ jusqu'à la veille du retour (le jour du retour, le bateau
// se libère pour le suivant : c'est la rotation du samedi).
export function getDayState(owner, day) {
  const p = { start: day, end: day }
  const block = getOwnerBlocks(owner.id).find(b => overlaps(b, p))
  if (block) return { state: 'mine', block }
  if (getBoatRentals(owner.boatId).some(r => overlaps(r, p))) return { state: 'loue' }
  if (day < TODAY) return { state: 'passe' }
  return { state: 'libre' }
}

// ── Réserver son bateau (dates bloquées) ─────────────────────────────
export const getOwnerBlocks = ownerId => state.blocks.filter(b => b.ownerId === ownerId).sort((a, b) => a.start.localeCompare(b.start))
export function getAllBlocks() { return state.blocks.map(b => ({ ...b, boatId: OWNERS.find(o => o.id === b.ownerId)?.boatId })) }

// Retourne { ok } ou { ok: false, error } avec une phrase simple à afficher.
export function addBlock(ownerId, start, end, label) {
  const owner = OWNERS.find(o => o.id === ownerId)
  if (!start || !end) return { ok: false, error: 'Choisissez le jour de départ et le jour de retour.' }
  if (end < start) return { ok: false, error: 'Le jour de retour doit être après le jour de départ.' }
  if (start < TODAY) return { ok: false, error: 'Cette date est déjà passée.' }
  const p = { start, end }
  if (getBoatRentals(owner.boatId).some(r => overlaps(r, p))) return { ok: false, error: 'Votre bateau est déjà loué à ces dates. Écrivez à l\'agence pour en parler.' }
  if (getOwnerBlocks(ownerId).some(b => overlaps(b, p))) return { ok: false, error: 'Vous avez déjà réservé une partie de ces dates.' }
  update({ blocks: [...state.blocks, { id: 'blk-' + Date.now(), ownerId, start, end, label: label || 'Pour moi', createdAt: TODAY }] })
  return { ok: true }
}
export function removeBlock(id) {
  update({ blocks: state.blocks.filter(b => b.id !== id) })
}

// ── Revenus ──────────────────────────────────────────────────────────
export function getRevenue(owner = DEMO_OWNER, year = '2026') {
  const rentals = getBoatRentals(owner.boatId).filter(r => r.start.startsWith(year))
  const sum = list => list.reduce((n, r) => n + r.amount, 0)
  const gross = sum(rentals)
  const past = sum(rentals.filter(r => r.start < TODAY))
  return {
    count: rentals.length,
    gross,
    ownerTotal: Math.round(gross * owner.ownerShare),
    ownerPast: Math.round(past * owner.ownerShare),
    ownerUpcoming: Math.round((gross - past) * owner.ownerShare),
    share: owner.ownerShare,
  }
}

// ── Suivi : ce qui a été fait sur le bateau ──────────────────────────
// Sans nom de locataire : seulement le type d'intervention, la date et qui l'a faite.
export function getBoatHistory(owner = DEMO_OWNER, limit = 8) {
  const st = getState()
  const tech = buildAllMissions()
    .filter(m => m.boatId === owner.boatId && m.date < TODAY)
    .map(m => ({
      key: m.key, date: m.date,
      label: m.type === 'depart' ? 'Bateau vérifié avant une location' : 'Bateau vérifié au retour d\'une location',
      by: 'Technicien de l\'agence',
      done: m.type === 'depart' ? !!st.checkIns?.[m.bookingId]?.done : true, // démo : retours passés considérés faits
    }))
  const menage = buildAllMenageMissions()
    .filter(m => m.boatId === owner.boatId && m.date < TODAY)
    .map(m => ({ key: m.key, date: m.date, label: 'Ménage fait', by: m.providerName, done: !!m.done }))
  const services = state.services
    .filter(s => s.ownerId === owner.id && s.status === 'faite' && s.date)
    .map(s => ({ key: s.id, date: s.date, label: `${serviceLabel(s.type)} (votre demande)`, by: 'L\'agence', done: true }))
  return [...tech, ...menage, ...services].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit)
}

// ── Demandes de services ─────────────────────────────────────────────
// Cycle : envoyee → acceptee → faite (ou refusee). Le prix est fixé par l'agence, hors démo.
export const getOwnerServices = ownerId => state.services.filter(s => s.ownerId === ownerId)
export function requestService(ownerId, type, date, note) {
  update({ services: [{ id: 'srv-' + Date.now(), ownerId, type, date: date || null, note: note || '', status: 'envoyee', createdAt: TODAY }, ...state.services] })
}
export function setServiceStatus(id, status) {
  update({ services: state.services.map(s => (s.id === id ? { ...s, status } : s)) })
}

// ── Messages propriétaire ↔ agence ───────────────────────────────────
// Fil séparé du fil interne de l'agence (techniciens, ménage, skippers), jamais visible du propriétaire.
export const getOwnerMessages = ownerId => state.messages.filter(m => m.ownerId === ownerId)
export function sendOwnerMessage(ownerId, from, text) {
  if (!text.trim()) return
  const other = from === 'owner' ? 'agency' : 'owner'
  update({
    messages: [...state.messages, { id: 'om-' + Date.now(), ownerId, from, text: text.trim(), date: "Aujourd'hui" }],
    unread: { ...state.unread, [other]: { ...state.unread[other], [ownerId]: (state.unread[other][ownerId] || 0) + 1 } },
  })
}
export const getUnread = (side, ownerId) => state.unread[side][ownerId] || 0
export function markRead(side, ownerId) {
  if (!getUnread(side, ownerId)) return
  update({ unread: { ...state.unread, [side]: { ...state.unread[side], [ownerId]: 0 } } })
}

// ── Pour l'agence : ce qui attend une action ─────────────────────────
// Alimente le badge du menu « Propriétaires » et la liste « À traiter » de la vue d'ensemble.
export function getOwnerToDo(ownerId) {
  const pending = getOwnerServices(ownerId).filter(s => s.status === 'envoyee')
  return { pending, unread: getUnread('agency', ownerId), total: pending.length + (getUnread('agency', ownerId) ? 1 : 0) }
}
export function getAgencyOwnerAlerts(brand) {
  return OWNERS
    .filter(o => !brand || getOwnerBoat(o)?.brand === brand)
    .map(o => ({ owner: o, boat: getOwnerBoat(o), ...getOwnerToDo(o.id) }))
    .filter(a => a.total > 0)
}
