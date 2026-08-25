// État partagé en mémoire entre agence et techniciens
// En production ce sera Supabase realtime

let listeners = []
let state = {
  // techTasks : bookingId -> missionKey ('dep-<id>' | 'ret-<id>') -> [{id,label,done}]
  // Rempli à la demande (getTechTasks) avec des modèles par défaut, pas figé à l'avance.
  techTasks: {},
  // missionAssignments : missionKey -> techId. Par défaut, un technicien est responsable
  // du bateau (voir mock-data TECHNICIANS.assignedBoats) ; l'agence peut réassigner
  // une mission précise à un autre technicien, ce qui prime sur ce défaut.
  missionAssignments: {},
  // missionRequests : demandes d'un technicien (empêchement, échange...) à traiter par l'agence.
  missionRequests: [],
  // Notes libres du technicien sur une mission (départ ou retour), accessibles depuis
  // la fiche mission. bookingId -> texte.
  missionNotes: {},
  checkIns: {}, // bookingId -> { done: bool, signature: bool, remarks: string, missing: {} }
  // checkInProgress : état du check-in EN COURS (avant signature), pour qu'un technicien
  // qui ferme la fenêtre sans avoir terminé retrouve tout tel quel en revenant.
  checkInProgress: {},
  // maintenanceTasks: bookingId (celui qui se termine) -> { arrival: [...tasks], departure: [...tasks] | null }
  // "arrival" = préparation pour le client qui arrive juste après ce booking
  // "departure" = état des lieux du bateau qui vient de se terminer (le booking lui-même)
  maintenanceTasks: {},
}

export function getCheckInProgress(bookingId) {
  if (!state.checkInProgress[bookingId]) {
    state.checkInProgress[bookingId] = { checked: {}, missing: {}, remarks: '' }
  }
  return state.checkInProgress[bookingId]
}

export function toggleCheckInItem(bookingId, itemId) {
  const current = getCheckInProgress(bookingId)
  state = {
    ...state,
    checkInProgress: {
      ...state.checkInProgress,
      [bookingId]: { ...current, checked: { ...current.checked, [itemId]: !current.checked[itemId] } },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function setCheckInItemsBulk(bookingId, itemIds, value) {
  const current = getCheckInProgress(bookingId)
  const nextChecked = { ...current.checked }
  itemIds.forEach(id => { nextChecked[id] = value })
  state = {
    ...state,
    checkInProgress: {
      ...state.checkInProgress,
      [bookingId]: { ...current, checked: nextChecked },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function setCheckInMissing(bookingId, itemId, value) {
  const current = getCheckInProgress(bookingId)
  state = {
    ...state,
    checkInProgress: {
      ...state.checkInProgress,
      [bookingId]: { ...current, missing: { ...current.missing, [itemId]: value } },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function setCheckInRemarks(bookingId, text) {
  const current = getCheckInProgress(bookingId)
  state = {
    ...state,
    checkInProgress: {
      ...state.checkInProgress,
      [bookingId]: { ...current, remarks: text },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function getMaintenanceTasks(bookingId, arrivalDefaults, departureDefaults) {
  if (!state.maintenanceTasks[bookingId]) {
    state.maintenanceTasks[bookingId] = {
      arrival: arrivalDefaults || [],
      departure: departureDefaults || [],
      anomalyDetails: {}, // itemId -> { price, note, dismissed }
    }
  }
  if (!state.maintenanceTasks[bookingId].anomalyDetails) {
    state.maintenanceTasks[bookingId].anomalyDetails = {}
  }
  return state.maintenanceTasks[bookingId]
}

// Le technicien compte les quantités au check-out (comparées automatiquement à la référence
// du check-in de départ, stockée dans `max`).
export function setArrivalQuantity(bookingId, itemId, qty) {
  const current = state.maintenanceTasks[bookingId]
  if (!current) return
  state = {
    ...state,
    maintenanceTasks: {
      ...state.maintenanceTasks,
      [bookingId]: {
        ...current,
        arrival: current.arrival.map(t => t.id === itemId ? { ...t, qty } : t),
      },
    },
  }
  listeners.forEach(fn => fn(state))
}

// Le technicien peut préciser un prix / une note sur un écart détecté, ou l'écarter
// (fausse alerte) sans changer la quantité comptée.
export function updateAnomalyDetail(bookingId, itemId, patch) {
  const current = state.maintenanceTasks[bookingId]
  if (!current) return
  state = {
    ...state,
    maintenanceTasks: {
      ...state.maintenanceTasks,
      [bookingId]: {
        ...current,
        anomalyDetails: {
          ...(current.anomalyDetails || {}),
          [itemId]: { ...((current.anomalyDetails || {})[itemId] || {}), ...patch },
        },
      },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function toggleMaintenanceTask(bookingId, section, taskId) {
  const current = state.maintenanceTasks[bookingId]
  if (!current) return
  state = {
    ...state,
    maintenanceTasks: {
      ...state.maintenanceTasks,
      [bookingId]: {
        ...current,
        [section]: current[section].map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      },
    },
  }
  listeners.forEach(fn => fn(state))
}

export function setMissionNote(bookingId, text) {
  state = { ...state, missionNotes: { ...state.missionNotes, [bookingId]: text } }
  listeners.forEach(fn => fn(state))
}

export function getState() { return state }

export function getTechTasks(techId, missionKey, defaultTasks) {
  if (!state.techTasks[techId]) state.techTasks[techId] = {}
  if (!state.techTasks[techId][missionKey]) state.techTasks[techId][missionKey] = defaultTasks
  return state.techTasks[techId][missionKey]
}

export function toggleTask(techId, missionKey, taskId) {
  const current = state.techTasks[techId]?.[missionKey] || []
  state = {
    ...state,
    techTasks: {
      ...state.techTasks,
      [techId]: {
        ...state.techTasks[techId],
        [missionKey]: current.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      },
    },
  }
  listeners.forEach(fn => fn(state))
}

// L'agence réassigne une mission précise à un autre technicien que le responsable par défaut.
export function assignMission(missionKey, techId) {
  state = { ...state, missionAssignments: { ...state.missionAssignments, [missionKey]: techId } }
  listeners.forEach(fn => fn(state))
}

// Un technicien signale un empêchement (ou autre demande) sur une mission ; l'agence
// la voit et peut réassigner en conséquence.
export function addMissionRequest(missionKey, techId, techName, message) {
  const request = { id: 'req-' + Date.now(), missionKey, techId, techName, message, status: 'open' }
  state = { ...state, missionRequests: [...state.missionRequests, request] }
  listeners.forEach(fn => fn(state))
}

export function resolveMissionRequest(requestId) {
  state = { ...state, missionRequests: state.missionRequests.map(r => r.id === requestId ? { ...r, status: 'resolved' } : r) }
  listeners.forEach(fn => fn(state))
}

export function completeCheckIn(bookingId, data) {
  state = { ...state, checkIns: { ...state.checkIns, [bookingId]: { ...data, done: true } } }
  listeners.forEach(fn => fn(state))
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
