// État partagé en mémoire entre agence et techniciens
// En production ce sera Supabase realtime

let listeners = []
let state = {
  techTasks: {
    'tech-1': {
      'm1': [{id:'t1',label:'Nettoyage cabines',done:true},{id:'t2',label:'Draps posés (3 jeux)',done:true},{id:'t3',label:'Inventaire vérifié',done:true},{id:'t4',label:'Équipements sécurité',done:false},{id:'t5',label:'Carburant vérifié',done:false}],
      'm2': [{id:'t6',label:'Vérification état général',done:false},{id:'t7',label:'Inventaire retour',done:false},{id:'t8',label:'Nettoyage complet',done:false},{id:'t9',label:'Photos état du bateau',done:false}],
      'm3': [{id:'t10',label:'Nettoyage cockpit',done:false},{id:'t11',label:'Inventaire complet',done:false},{id:'t12',label:'Équipements sécurité',done:false}],
      'm4': [{id:'t13',label:'Nettoyage cabines',done:false},{id:'t14',label:'Inventaire vérifié',done:false},{id:'t15',label:'Équipements sécurité',done:false}],
    },
    'tech-2': {
      'm5': [{id:'t16',label:'Nettoyage cockpit',done:true},{id:'t17',label:'Carburant plein',done:false,alert:true},{id:'t18',label:'Inventaire vérifié',done:false},{id:'t19',label:'Équipements sécurité',done:false}],
      'm6': [{id:'t20',label:'État général vérifié',done:false},{id:'t21',label:'Inventaire retour',done:false},{id:'t22',label:'Nettoyage',done:false}],
    },
    'tech-3': {
      'm7': [{id:'t23',label:'Nettoyage cabines (4)',done:false},{id:'t24',label:'Draps posés (4 jeux)',done:false},{id:'t25',label:'Inventaire cuisine',done:false},{id:'t26',label:'Équipements sécurité',done:false},{id:'t27',label:'Vérification moteurs',done:false}],
      'm8': [{id:'t28',label:'Nettoyage cabines (5)',done:false},{id:'t29',label:'Draps posés (5 jeux)',done:false},{id:'t30',label:'Inventaire complet',done:false},{id:'t31',label:'Équipements sécurité',done:false}],
      'm9': [{id:'t32',label:'État général vérifié',done:false},{id:'t33',label:'Inventaire retour',done:false},{id:'t34',label:'Nettoyage complet',done:false},{id:'t35',label:'Rapport état des lieux',done:false}],
    },
  },
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

export function toggleTask(techId, missionId, taskId) {
  state = {
    ...state,
    techTasks: {
      ...state.techTasks,
      [techId]: {
        ...state.techTasks[techId],
        [missionId]: state.techTasks[techId][missionId].map(t =>
          t.id === taskId ? { ...t, done: !t.done } : t
        )
      }
    }
  }
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
