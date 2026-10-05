import { parseISO, addDays, format } from 'date-fns'
import { BOATS, BOOKINGS, TECHNICIANS, CLIENTS } from './mock-data'
import { getState, getTechTasks, isTechOff } from './shared-state'
import { getMenageForTechMission } from './menage-missions'

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
// Sortie à la journée (bateau à moteur / semi-rigide, pas de cabines) : pas de draps,
// on contrôle surtout le carburant et la sécurité.
const DEPART_JOURNEE_TASKS = [
  { label: 'Plein carburant vérifié' },
  { label: 'Équipements sécurité' },
  { label: 'Briefing client' },
]
const RETOUR_JOURNEE_TASKS = [
  { label: 'Check-out avec le client' },
  { label: 'Niveau carburant relevé' },
  { label: 'Rinçage / nettoyage' },
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
    const realClient = CLIENTS.find(c => c.id === b.clientId) || CLIENTS.find(c => c.locations.includes(b.id))
    // Société de ménage qui intervient avant ce départ / à ce retour (null = le technicien nettoie).
    const menageDepart = getMenageForTechMission('depart', b)
    const menageRetour = getMenageForTechMission('retour', b)
    // Sortie d'un jour : départ et retour le même jour (sinon le retour tombait la veille).
    const isDayTrip = b.start === b.end

    // ── Départ ──
    const departKey = `dep-${b.id}`
    // Responsable du bateau en congé ce jour-là (et pas de réassignation) → mission à réassigner.
    const departTechId = assignments[departKey] || (isTechOff(defaultTech.id, b.start) ? null : defaultTech.id)
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
      heure: isDayTrip ? '09:00' : '08:30',
      statut: computeStatut(b.start),
      defaultTasks: isDayTrip ? DEPART_JOURNEE_TASKS : DEFAULT_DEPART_TASKS,
      menage: menageDepart,
    })

    // ── Retour ──
    const retourKey = `ret-${b.id}`
    const hasLastNight = b.lastNightAboard !== false
    const retourDate = isDayTrip || hasLastNight ? b.end : format(addDays(parseISO(b.end), -1), 'yyyy-MM-dd')
    const retourTechId = assignments[retourKey] || (isTechOff(defaultTech.id, retourDate) ? null : defaultTech.id)
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
      heure: isDayTrip ? '18:00' : hasLastNight ? '10:00' : '17:00',
      moment: isDayTrip ? 'Fin de sortie' : hasLastNight ? 'Samedi matin' : 'Vendredi soir',
      statut: computeStatut(retourDate),
      defaultTasks: isDayTrip ? RETOUR_JOURNEE_TASKS : hasLastNight ? RETOUR_SAMEDI_TASKS : RETOUR_VENDREDI_TASKS,
      menage: menageRetour,
    })
  })

  // Ordre chronologique, retours avant départs à date égale (il faut rendre le bateau
  // avant de pouvoir le relouer).
  // Exception : pour une sortie d'un jour, le départ précède évidemment son propre retour.
  missions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.bookingId === b.bookingId) return a.type === 'depart' ? -1 : 1
    return (a.type === 'retour' ? -1 : 1) - (b.type === 'retour' ? -1 : 1)
  })
  return missions
}

export function getMissionsForTech(techId) {
  return buildAllMissions().filter(m => m.techId === techId)
}

// Missions sans technicien (le responsable est en congé) : à réassigner par l'agence.
export function getUnassignedMissions() {
  return buildAllMissions().filter(m => !m.techId && m.date >= '2026-07-04')
}

// Techniciens proposables pour une mission : tous sauf ceux en congé ce jour-là.
// Ceux d'une autre base restent proposés (l'équipe s'adapte), avec la mention « autre base ».
export function getTechOptions(mission) {
  const defaultTech = TECHNICIANS.find(t => t.id === mission.defaultTechId)
  return TECHNICIANS
    .filter(t => !isTechOff(t.id, mission.date))
    .map(t => ({ ...t, otherBase: defaultTech && t.base !== defaultTech.base }))
    .sort((a, b) => Number(a.otherBase) - Number(b.otherBase))
}

// Tâches « nettoyage » retirées de la check-list quand une société de ménage s'en charge.
const CLEANING_TASK = /^nettoyage/i

// Check-list d'une mission pour un technicien. Source UNIQUE pour la page Techniciens (agence)
// et l'app technicien : crée la liste au premier accès (sinon l'app technicien restait vide
// tant que l'agence n'avait pas ouvert sa page).
export function getMissionTasks(tech, mission) {
  const seedTasks = tech.tasks?.[mission.boatId] // tâches de démo déjà présentes pour ce bateau
  const source = seedTasks && seedTasks.length ? seedTasks : mission.defaultTasks
  const defaults = source
    .filter(t => !(mission.menage && CLEANING_TASK.test(t.label)))
    .map((t, i) => ({ id: `${mission.key}-${i}`, label: t.label, done: mission.date < '2026-07-04' ? true : (t.done ?? false) }))
  return getTechTasks(tech.id, mission.key, defaults)
}

// Statut du ménage visible par le technicien : fait ou pas, par qui.
export function getMenageStatus(mission) {
  if (!mission.menage) return null
  const st = getState()
  const done = !!st.menageDone[mission.menage.key]
  return { ...mission.menage, done, meta: st.menageDoneMeta?.[mission.menage.key] || null }
}
