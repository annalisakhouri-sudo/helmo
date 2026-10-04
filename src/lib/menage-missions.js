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
  const done = getState().menageDone || {}
  const missions = []

  BOOKINGS.forEach(b => {
    // Le ménage sous-traité n'a lieu que si l'option a été prise à la création de la location —
    // sinon le nettoyage de base reste géré par le technicien dans son check-out habituel.
    if (!b.options?.menage) return
    const boat = BOATS.find(bt => bt.id === b.boatId)
    if (!boat) return
    const provider = getDefaultMenageForBoat(b.boatId)
    if (!provider) return

    const hasLastNight = b.lastNightAboard !== false
    // Sortie d'un jour : ménage le soir même, au retour (sinon la date tombait la veille).
    const isDayTrip = b.start === b.end
    const date = isDayTrip || hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
    const key = `menage-${b.id}`
    const menageOption = OPTIONS_CATALOG.find(o => o.id === 'menage')
    missions.push({
      id: key,
      key,
      providerId: provider.id,
      date,
      weekStart: format(getSaturdayOnOrBefore(parseISO(date)), 'yyyy-MM-dd'),
      boatId: boat.id,
      boat: boat.name,
      client: b.client,
      bookingId: b.id,
      heure: isDayTrip ? '18:30' : hasLastNight ? '10:30' : '17:30',
      statut: computeStatut(date),
      done: !!done[key],
      // Gardé même s'il n'y a qu'une seule agence aujourd'hui : permet de regrouper par
      // agence/marque le jour où un même prestataire travaille pour plusieurs agences.
      agencyBrand: b.brand,
      agencyName: BRANDS[b.brand]?.name || b.brand,
      price: menageOption?.price || 70,
    })
  })

  missions.sort((a, b) => a.date.localeCompare(b.date))
  return missions
}

export function getMissionsForProvider(providerId) {
  return buildAllMenageMissions().filter(m => m.providerId === providerId)
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
