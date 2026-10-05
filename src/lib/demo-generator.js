// Génère une saison de démo réaliste (janvier 2026 → juin 2027).
// Déterministe (même résultat à chaque chargement) : la démo est identique pour tout le monde.
// - Taux de remplissage selon la saison (plein en été, quasi vide l'hiver).
// - Clients : la plupart font 1 à 3 locations, quelques fidèles 4-5.
// - Skippers : jamais deux bateaux en même temps.

function rng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(20260704)
const pick = arr => arr[Math.floor(rand() * arr.length)]
const chance = p => rand() < p

const iso = d => d.toISOString().slice(0, 10)
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const month = s => Number(s.slice(5, 7))

// Taux d'occupation hebdo des voiliers / catamarans, par mois.
const WEEKLY_FILL = { 1: 0.02, 2: 0.03, 3: 0.06, 4: 0.25, 5: 0.45, 6: 0.75, 7: 0.97, 8: 0.97, 9: 0.65, 10: 0.35, 11: 0.04, 12: 0.06 }
// Sorties à la journée (Locamotors) : nombre moyen de jours loués par bateau et par semaine.
const DAY_TRIPS_PER_WEEK = { 1: 0, 2: 0, 3: 0.2, 4: 0.6, 5: 1.2, 6: 2.2, 7: 3.2, 8: 3.2, 9: 1.8, 10: 0.8, 11: 0.1, 12: 0.1 }

// Janvier 2026 → juin 2027 : un historique avant « aujourd'hui » (4 juillet 2026) et la saison suivante.
const START = '2026-01-03' // samedi
const WEEKS = 78

const FIRST = ['Julien','Camille','Thomas','Léa','Nicolas','Chloé','Antoine','Manon','Maxime','Sarah','Hugo','Emma','Lucas','Inès','Louis','Clara','Arthur','Pauline','Romain','Marion','Paul','Lucie','Alexandre','Juliette','Mathieu','Anaïs','Benoît','Élodie','Vincent','Margaux','Guillaume','Laura','Sébastien','Charlotte','Olivier','Aurélie','Damien','Mélanie','Florian','Céline','Kevin','Audrey','Yann','Noémie','Cédric','Justine','Marc','Valérie','Pierre','Nathalie','Fabien','Sandrine','Jérôme','Isabelle','Matthias','Hélène','Bastien','Agathe','Raphaël','Zoé']
const LAST = ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Mercier','Dupont','Lambert','Bonnet','François','Martinez','Legrand','Garnier','Faure','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas','Perrin','Morin','Mathieu','Clement','Gauthier','Dumont','Lopez','Fontaine','Chevalier','Robin','Masson','Sanchez','Gerard','Nguyen','Boyer','Denis','Lemaire','Duval','Joly','Gautier','Roger','Roche']

function phone() {
  const p = () => String(Math.floor(rand() * 100)).padStart(2, '0')
  return `0${pick(['6', '7'])} ${p()} ${p()} ${p()} ${p()}`
}
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// ── 1. Les locations (sans client pour l'instant) ─────────────────────
function buildBookings(boats, skippers) {
  const out = []
  const weekly = boats.filter(b => b.cabines > 0)
  const dayBoats = boats.filter(b => b.cabines === 0)

  weekly.forEach(boat => {
    let w = 0
    while (w < WEEKS) {
      const start = addDays(START, w * 7)
      const fill = WEEKLY_FILL[month(start)]
      if (!chance(fill)) { w++; continue }
      const weeks = month(start) >= 7 && month(start) <= 8 && chance(0.1) ? 2 : 1
      out.push({ boat, start, end: addDays(start, 7 * weeks), day: false })
      w += weeks
    }
  })

  dayBoats.forEach(boat => {
    for (let w = 0; w < WEEKS; w++) {
      const sat = addDays(START, w * 7)
      const n = DAY_TRIPS_PER_WEEK[month(sat)]
      const count = Math.floor(n) + (chance(n - Math.floor(n)) ? 1 : 0)
      // En été n'importe quel jour ; hors saison plutôt le week-end.
      const days = month(sat) >= 6 && month(sat) <= 9 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 6]
      const used = new Set()
      for (let i = 0; i < count && used.size < days.length; i++) {
        let d; do { d = pick(days) } while (used.has(d))
        used.add(d)
        const date = addDays(sat, d)
        out.push({ boat, start: date, end: date, day: true })
      }
    }
  })

  out.sort((a, b) => a.start.localeCompare(b.start) || a.boat.id.localeCompare(b.boat.id))

  // Skippers : ~25 % des locations hebdo en demandent un. Jamais deux bateaux à la fois.
  const busy = Object.fromEntries(skippers.map(s => [s.id, []]))
  const isFree = (sid, s, e) => !busy[sid].some(([a, b]) => a < e && s < b)
  let missing = 0
  return out.map((x, i) => {
    const { boat, start, end, day } = x
    const cap = boat.capacite || 8
    const adults = Math.max(2, Math.min(cap, 2 + Math.floor(rand() * (cap - 1))))
    const kids = !day && chance(0.35) ? 1 + Math.floor(rand() * 2) : 0
    const guests = `${adults} adultes${kids ? `, ${kids} enfant${kids > 1 ? 's' : ''}` : ''}`

    const b = {
      id: `bk-${i + 1}`, boatId: boat.id, boatName: boat.name, brand: boat.brand,
      clientId: null, client: '', phone: '', guests, start, end,
      skipperId: null, skipperName: null, skipperInitials: null,
      needsSkipper: false, draps: [], options: {},
      status: 'confirmed', color: 'teal',
      lastNightAboard: day ? false : chance(0.7),
    }

    if (!day && chance(0.25)) {
      // 3 locations des semaines qui viennent restent « skipper à trouver » pour la démo,
      // et on garde Jean-Marc libre sur la première pour pouvoir lui envoyer la demande.
      if (missing < 3 && start >= '2026-07-11' && start <= '2026-08-01') {
        missing++
        b.needsSkipper = true; b.status = 'skipper-missing'; b.color = 'amber'
        if (missing === 1) busy['skip-1'].push([start, end, 'reserve'])
      } else {
        const s = skippers.find(sk => sk.boats.some(t => boat.type.includes(t)) && isFree(sk.id, start, end))
        if (s) {
          busy[s.id].push([start, end])
          Object.assign(b, { needsSkipper: true, skipperId: s.id, skipperName: s.name, skipperInitials: s.initials })
        }
      }
    }
    // la réservation fictive de Jean-Marc ne bloque que l'affectation automatique
    if (i === out.length - 1) busy['skip-1'] = busy['skip-1'].filter(r => r[2] !== 'reserve')

    if (!day) {
      if (chance(0.5)) b.draps = [{ name: 'Grand lit 160×200', qty: Math.min(boat.cabines, 1 + Math.floor(rand() * boat.cabines)), unit: 'jeux' }]
      if (chance(0.4)) b.options.menage = true
      if (chance(0.2)) b.options.sup = { qty: 1 + Math.floor(rand() * 2) }
      if (chance(0.15)) b.options.taud = true
      if (chance(0.15)) b.options.masque = { qty: 2 + Math.floor(rand() * 3) }
      if (chance(0.3)) b.options.franchise = { qty: 1 }
    } else {
      if (chance(0.6)) b.options.carbu = true
      if (chance(0.1)) b.options.menage = true
    }
    return b
  })
}

// ── 2. Les clients : la plupart 1 à 3 locations ──────────────────────
// Garantit qu'au moins une location « skipper à trouver » soit faisable par Jean-Marc
// (le skipper de la session démo) : on libère sa semaine si besoin.
function freeJeanMarc(bookings, skippers) {
  const target = bookings.find(b => b.needsSkipper && !b.skipperId)
  if (!target) return
  const overlaps = (a, b) => a.start < b.end && b.start < a.end
  bookings.filter(b => b.skipperId === 'skip-1' && overlaps(b, target)).forEach(b => {
    const other = skippers.find(s => s.id !== 'skip-1' && !bookings.some(o => o.skipperId === s.id && overlaps(o, b)))
    if (other) Object.assign(b, { skipperId: other.id, skipperName: other.name, skipperInitials: other.initials })
    else Object.assign(b, { skipperId: null, skipperName: b.client, skipperInitials: '', clientIsSkipper: true })
  })
}

export function generateDemo(boats, skippers, baseClients) {
  const bookings = buildBookings(boats, skippers)
  freeJeanMarc(bookings, skippers)

  // Répartition : 25 % 1 loc, 40 % 2, 25 % 3, 10 % 4-5.
  const slots = []
  const clients = baseClients.map(c => ({ ...c, locations: [] }))
  const used = new Set(clients.map(c => `${c.prenom} ${c.nom}`))
  const visits = () => { const r = rand(); return r < 0.25 ? 1 : r < 0.65 ? 2 : r < 0.9 ? 3 : 4 + Math.floor(rand() * 2) }
  clients.forEach(c => { for (let k = 0; k < visits(); k++) slots.push(c) })
  let n = clients.length
  while (slots.length < bookings.length) {
    let prenom, nom
    do { prenom = pick(FIRST); nom = pick(LAST) } while (used.has(`${prenom} ${nom}`))
    used.add(`${prenom} ${nom}`)
    n++
    const hasPiece = chance(0.85)
    const c = {
      id: `cli-${n}`, nom, prenom, tel: phone(), tel2: '',
      email: `${slug(prenom)}.${slug(nom)}@email.com`,
      naissance: `${1960 + Math.floor(rand() * 40)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      nationalite: chance(0.85) ? 'Française' : pick(['Belge', 'Suisse', 'Italienne', 'Allemande', 'Britannique']),
      pieceId: { numero: hasPiece ? `FR${Math.floor(1e8 + rand() * 9e8)}` : '', type: 'CNI', uploaded: hasPiece },
      permis: chance(0.7) ? { numero: `PM-13-${2005 + Math.floor(rand() * 19)}-${Math.floor(100 + rand() * 900)}`, type: pick(['Côtier', 'Côtier', 'Hauturier']), uploaded: chance(0.9) } : { numero: '', type: '', uploaded: false },
      caution: { montant: pick([1500, 2000, 2500, 3000]), mode: pick(['CB', 'Chèque', 'Virement']), statut: chance(0.85) ? 'recue' : 'en_attente' },
      notes: '',
      locations: [],
    }
    clients.push(c)
    for (let k = 0, v = visits(); k < v; k++) slots.push(c)
  }

  // Mélange, puis attribution : jamais deux locations qui se chevauchent pour un même client.
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]] }
  const byClient = new Map()
  bookings.forEach(b => {
    let idx = slots.findIndex(c => !(byClient.get(c.id) || []).some(o => o.start < (b.end === b.start ? addDays(b.end, 1) : b.end) && b.start < (o.end === o.start ? addDays(o.end, 1) : o.end)))
    if (idx === -1) idx = 0
    const c = slots.splice(idx, 1)[0] || clients[Math.floor(rand() * clients.length)]
    b.clientId = c.id
    b.client = `${c.nom} ${c.prenom}`
    b.phone = c.tel
    if (b.clientIsSkipper) { b.skipperName = b.client; b.skipperInitials = (c.nom[0] + c.prenom[0]).toUpperCase() }
    c.locations.push(b.id)
    byClient.set(c.id, [...(byClient.get(c.id) || []), b])
  })

  return { bookings, clients: clients.filter(c => c.locations.length > 0) }
}
