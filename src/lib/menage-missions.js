import { parseISO, addDays, format } from 'date-fns'
import { BOATS, BOOKINGS, MENAGE_PROVIDERS } from './mock-data'
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
    const boat = BOATS.find(bt => bt.id === b.boatId)
    if (!boat) return
    const provider = getDefaultMenageForBoat(b.boatId)
    if (!provider) return

    const hasLastNight = b.lastNightAboard !== false
    const date = hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
    const key = `menage-${b.id}`
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
      heure: hasLastNight ? '10:30' : '17:30',
      statut: computeStatut(date),
      done: !!done[key],
    })
  })

  missions.sort((a, b) => a.date.localeCompare(b.date))
  return missions
}

export function getMissionsForProvider(providerId) {
  return buildAllMenageMissions().filter(m => m.providerId === providerId)
}
