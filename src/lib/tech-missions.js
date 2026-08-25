import { parseISO, addDays, format } from 'date-fns'
import { BOATS, BOOKINGS, TECHNICIANS, CLIENTS } from './mock-data'
import { getState } from './shared-state'

export const TODAY_STR = '2026-07-04'

// Calcule le samedi de la semaine courante (ou égal si déjà samedi) — même logique
// utilisée partout ailleurs dans l'appli (Dashboard, Planning).
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

const DEFAULT_DEPART_TASKS = [
  { label: 'Nettoyage cabines' },
  { label: 'Draps posés' },
  { label: 'Inventaire vérifié' },
  { label: 'Équipements sécurité' },
]
const RETOUR_SAMEDI_TASKS = [
  { label: 'Vérification état général' },
  { label: 'Inventaire retour' },
  { label: 'Nettoyage' },
  { label: 'Rapport état des lieux' },
]
const RETOUR_VENDREDI_TASKS = [
  { label: 'Check-out avec le client' },
  { label: 'Draps retirés' },
  { label: 'Nettoyage' },
  { label: 'Rapport état des lieux' },
]

// Le technicien par défaut responsable d'un bateau : le premier auquel ce bateau est
// assigné (mock-data TECHNICIANS.assignedBoats). L'agence peut réassigner une mission
// précise à quelqu'un d'autre via assignMission() — voir buildAllMissions ci-dessous.
export function getDefaultTechForBoat(boatId) {
  return TECHNICIANS.find(t => t.assignedBoats.includes(boatId)) || null
}

// ── Construit TOUTES les missions (départs + retours) à partir des VRAIES locations ──
// C'est la SEULE source utilisée à la fois par la page Techniciens (agence) et par
// l'app que voit chaque technicien connecté : les deux affichent exactement la même chose.
export function buildAllMissions() {
  const assignments = getState().missionAssignments || {}
  const missions = []

  BOOKINGS.forEach(b => {
    const boat = BOATS.find(bt => bt.id === b.boatId)
    if (!boat) return
    const defaultTech = getDefaultTechForBoat(b.boatId)
    if (!defaultTech) return
    const realClient = CLIENTS.find(c => c.locations.includes(b.id))

    // ── Départ ──
    const departKey = `dep-${b.id}`
    const departTechId = assignments[departKey] || defaultTech.id
    missions.push({
      id: departKey,
      key: departKey,
      type: 'depart',
      techId: departTechId,
      defaultTechId: defaultTech.id,
      date: b.start,
      weekStart: format(getSaturdayOnOrBefore(parseISO(b.start)), 'yyyy-MM-dd'),
      boatId: boat.id,
      boat: boat.name,
      client: b.client,
      clientId: realClient?.id || null,
      bookingId: b.id,
      skipperId: b.skipperId,
      heure: '08:30',
      statut: computeStatut(b.start),
      defaultTasks: DEFAULT_DEPART_TASKS,
    })

    // ── Retour ──
    const retourKey = `ret-${b.id}`
    const retourTechId = assignments[retourKey] || defaultTech.id
    const hasLastNight = b.lastNightAboard !== false
    const retourDate = hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
    missions.push({
      id: retourKey,
      key: retourKey,
      type: 'retour',
      techId: retourTechId,
      defaultTechId: defaultTech.id,
      date: retourDate,
      weekStart: format(getSaturdayOnOrBefore(parseISO(retourDate)), 'yyyy-MM-dd'),
      boatId: boat.id,
      boat: boat.name,
      client: b.client,
      clientId: realClient?.id || null,
      bookingId: b.id,
      skipperId: b.skipperId,
      heure: hasLastNight ? '10:00' : '17:00',
      moment: hasLastNight ? 'Samedi matin' : 'Vendredi soir',
      statut: computeStatut(retourDate),
      defaultTasks: hasLastNight ? RETOUR_SAMEDI_TASKS : RETOUR_VENDREDI_TASKS,
    })
  })

  // Ordre chronologique, retours avant départs à date égale (il faut rendre le bateau
  // avant de pouvoir le relouer).
  missions.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'retour' ? -1 : 1) - (b.type === 'retour' ? -1 : 1))
  return missions
}

export function getMissionsForTech(techId) {
  return buildAllMissions().filter(m => m.techId === techId)
}
