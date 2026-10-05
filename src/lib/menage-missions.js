import { parseISO, addDays, format } from 'date-fns'
import { BOATS, BOOKINGS, MENAGE_PROVIDERS, BRANDS, OPTIONS_CATALOG } from './mock-data'
import { getState } from './shared-state'

export const TODAY_STR = '2026-07-04'

function getSaturdayOnOrBefore(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day + 1) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function computeStatut(dateStr) {
  if (dateStr === TODAY_STR) return 'en_cours'
  if (dateStr < TODAY_STR) return 'termine'
  return 'a_venir'
}

// Le ménage par défaut est celui auquel le bateau est assigné (mock-data MENAGE_PROVIDERS.assignedBoats).
export function getDefaultMenageForBoat(boatId) {
  return MENAGE_PROVIDERS.find(m => m.assignedBoats.includes(boatId)) || null
}

// Une mission ménage par location : le nettoyage a lieu au retour du bateau (même moment que le
// check-out technicien), avant que le bateau reparte. On respecte la même règle de nuitée à bord.
export function buildAllMenageMissions() {
  const st = getState()
  const done = st.menageDone || {}
  const doneMeta = st.menageDoneMeta || {}
  const invoices = st.menageInvoices || {}
  const requests = st.menageRequests || {}
  const missions = []

  BOOKINGS.forEach(b => {
    // Le ménage sous-traité n'a lieu que si l'option a été prise à la création de la location —
    // sinon le nettoyage de base reste géré par le technicien dans son check-out habituel.
    if (!b.options?.menage) return
    const boat = BOATS.find(bt => bt.id === b.boatId)
    if (!boat) return
    // Société choisie à la création de la loc (demande envoyée), sinon celle assignée au bateau.
    const request = requests[b.id]
    const provider = MENAGE_PROVIDERS.find(p => p.id === (request?.providerId || b.menageProviderId)) || getDefaultMenageForBoat(b.boatId)
    if (!provider) return

    const hasLastNight = b.lastNightAboard !== false
    // Sortie d'un jour : ménage le soir même, au retour (sinon la date tombait la veille).
    const isDayTrip = b.start === b.end
    const date = isDayTrip || hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
    const key = `menage-${b.id}`
    const menageOption = OPTIONS_CATALOG.find(o => o.id === 'menage')
    const basePrice = menageOption?.price || 70
    const invoice = invoices[key]
    // Montant réel = celui de la facture si l'agence l'a ajusté, sinon le tarif de l'option.
    const amount = invoice?.data ? invoice.data.lineItems.reduce((n, li) => n + (Number(li.amount) || 0), 0) : basePrice
    const isDone = !!done[key]
    const isPaid = invoice?.status === 'payee'
    missions.push({
      id: key,
      key,
      providerId: provider.id,
      providerName: provider.company,
      // 'a_confirmer' → la société doit accepter (facture jointe) ; 'refusee' → l'agence en choisit une autre.
      requestStatus: request ? request.status : 'acceptee',
      date,
      weekStart: format(getSaturdayOnOrBefore(parseISO(date)), 'yyyy-MM-dd'),
      boatId: boat.id,
      boat: boat.name,
      client: b.client,
      bookingId: b.id,
      heure: isDayTrip ? '18:30' : hasLastNight ? '10:30' : '17:30',
      statut: computeStatut(date),
      done: isDone,
      doneMeta: doneMeta[key] || null,
      // Circuit unique : prevu → fait → regle. « À régler » = fait mais pas encore réglé.
      status: isPaid ? 'regle' : isDone ? 'fait' : 'prevu',
      paidAt: isPaid ? invoice.paidAt : null,
      paidVia: isPaid ? (invoice.paidVia || 'manuel') : null,
      amount,
      // Gardé même s'il n'y a qu'une seule agence aujourd'hui : permet de regrouper par
      // agence/marque le jour où un même prestataire travaille pour plusieurs agences.
      agencyBrand: b.brand,
      agencyName: BRANDS[b.brand]?.name || b.brand,
      price: basePrice,
    })
  })

  missions.sort((a, b) => a.date.localeCompare(b.date))
  return missions
}

// Planning d'une société = uniquement les ménages qu'elle a ACCEPTÉS.
export function getMissionsForProvider(providerId) {
  return buildAllMenageMissions().filter(m => m.providerId === providerId && m.requestStatus === 'acceptee')
}

// Demandes reçues par une société, en attente de sa réponse.
export function getPendingRequestsForProvider(providerId) {
  return buildAllMenageMissions().filter(m => m.providerId === providerId && m.requestStatus === 'a_confirmer')
}

// Côté agence : ménages pas encore confirmés (en attente ou refusés).
export function getUnconfirmedMenages(brand) {
  return buildAllMenageMissions().filter(m => m.requestStatus !== 'acceptee' && (!brand || m.agencyBrand === brand))
}

// Connexion par code d'accès (donné par l'agence) plutôt que par sélection dans une liste.
export function getProviderByAccessCode(code) {
  const normalized = (code || '').trim().toUpperCase()
  return MENAGE_PROVIDERS.find(p => p.accessCode.toUpperCase() === normalized) || null
}

// Regroupe les missions d'un prestataire par agence/marque — utile dès qu'un même
// prestataire travaille pour plusieurs agences.
export function groupMissionsByAgency(missions) {
  const groups = {}
  missions.forEach(m => {
    if (!groups[m.agencyName]) groups[m.agencyName] = []
    groups[m.agencyName].push(m)
  })
  return Object.entries(groups).map(([agencyName, items]) => ({ agencyName, items }))
}

// Compte rendu par semaine ou par mois : nombre de missions faites, montant total.
export function buildPeriodSummary(missions, periodType = 'week') {
  const groups = {}
  missions.forEach(m => {
    const key = periodType === 'month' ? m.date.slice(0, 7) : m.weekStart
    if (!groups[key]) groups[key] = { key, missions: [], total: 0, planned: 0, doneCount: 0 }
    groups[key].missions.push(m)
    groups[key].planned += m.price
    if (m.done) { groups[key].total += m.price; groups[key].doneCount += 1 }
  })
  return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key))
}

// « Coché par Nickel Nautique à 18h42 » / « Marqué fait par l'agence à 9h05 »
export function doneByLabel(m) {
  if (!m.done) return null
  const meta = m.doneMeta
  if (!meta) return 'Fait'
  const t = new Date(meta.at)
  const hour = `${t.getHours()}h${String(t.getMinutes()).padStart(2, '0')}`
  return meta.type === 'agency' ? `Marqué fait par l'agence à ${hour}` : `Coché par ${meta.name} à ${hour}`
}

export function paidLabel(m) {
  if (m.status !== 'regle') return null
  const d = new Date(m.paidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return m.paidVia === 'stripe' ? `Réglé en ligne le ${d}` : `Réglé (manuel) le ${d}`
}

// Le ménage qui concerne une mission technicien :
// - retour d'une loc : le ménage de cette même loc (fait au retour du bateau) ;
// - départ d'une loc : le ménage de la loc précédente sur ce bateau (bateau nettoyé avant le départ).
// Renvoie null si aucune société de ménage n'intervient → le technicien nettoie lui-même.
export function getMenageForTechMission(type, booking) {
  let source = booking
  if (type === 'depart') {
    source = BOOKINGS
      .filter(o => o.boatId === booking.boatId && o.id !== booking.id && o.end <= booking.start)
      .sort((a, b) => b.end.localeCompare(a.end))[0]
  }
  if (!source || !source.options?.menage) return null
  const req = getState().menageRequests?.[source.id]
  if (req && req.status !== 'acceptee') return null // pas encore confirmé par une société → le technicien garde le nettoyage
  const provider = MENAGE_PROVIDERS.find(p => p.id === (req?.providerId || source.menageProviderId)) || getDefaultMenageForBoat(source.boatId)
  if (!provider) return null
  return { key: `menage-${source.id}`, providerName: provider.company }
}
