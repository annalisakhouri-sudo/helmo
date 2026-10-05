// État partagé en mémoire entre agence et techniciens
// En production ce sera Supabase realtime

import { INVOICE_TYPES, getInvoiceTypeDefaults } from './invoice-templates'

let listeners = []
let state = {
  // techTasks : bookingId -> missionKey ('dep-<id>' | 'ret-<id>') -> [{id,label,done}]
  // Rempli à la demande (getTechTasks) avec des modèles par défaut, pas figé à l'avance.
  techTasks: {},
  // missionAssignments : missionKey -> techId. Par défaut, un technicien est responsable
  // du bateau (voir mock-data TECHNICIANS.assignedBoats) ; l'agence peut réassigner
  // une mission précise à un autre technicien, ce qui prime sur ce défaut.
  missionAssignments: {},
  // techDaysOff : techId -> [{ id, start, end, label }] (dates incluses). Un technicien en congé
  // n'est pas proposé pour une mission ces jours-là, et ses missions passent « à réassigner ».
  techDaysOff: {
    'tech-3': [{ id: 'off-1', start: '2026-07-18', end: '2026-07-24', label: 'Congés' }],
  },
  // missionRequests : demandes d'un technicien (empêchement, échange...) à traiter par l'agence.
  missionRequests: [],
  // Notes libres du technicien sur une mission (départ ou retour), accessibles depuis
  // la fiche mission. bookingId -> texte.
  missionNotes: {},
  // menageDone : missionKey -> bool. Le prestataire de ménage étant une société tierce (pas connectée
  // à Helmo), l'agence coche elle-même quand le nettoyage est confirmé fait.
  menageDone: {},
  // menageDoneMeta : missionKey -> { type: 'provider' | 'agency', name, at }
  // Qui a coché « ménage fait » et quand (la société elle-même, ou l'agence en rattrapage).
  menageDoneMeta: {},
  // menageRequests : bookingId -> { providerId, status: 'a_confirmer' | 'acceptee' | 'refusee', sentAt, answeredAt }
  // Demande envoyée à la société de ménage à la création de la loc (avec la facture à confirmer).
  // Sans entrée = location de démo déjà confirmée avec la société assignée au bateau.
  menageRequests: {},
  // menageInvoices : missionKey -> { content, status: 'generee' | 'payee', paidAt }
  // Facture automatique entre l'agence et le prestataire de ménage, visible des deux côtés.
  menageInvoices: {},
  // contracts : voir les fonctions getContract/setContractTemplate/updateContractContent/sendContract plus bas
  contracts: {},
  // invoices : bookingId -> { data: {...lignes modifiables}, status: 'brouillon' | 'envoyee' | 'payee', sentAt, paidAt }
  // Sert au suivi de l'activité et des paiements — voir les fonctions plus bas.
  invoices: {},
  // Trame de chaque type de facture (client, ménage…), éditable une seule fois dans
  // Options & tarifs → Facturation, puis appliquée à toutes les factures de ce type.
  invoiceTemplates: Object.fromEntries(INVOICE_TYPES.map(t => [t.id, { ...t.defaults }])),
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

// ── Contrats ──────────────────────────────────────────────────────
// contracts : bookingId -> { templateId, content, status: 'brouillon' | 'envoye', sentAt }
// Le contenu par défaut est généré à la demande (contract.js) dès que la fiche est ouverte
// pour la première fois — pas besoin d'action explicite à la création de la location.
export function getContract(bookingId, defaultTemplateId, defaultContent) {
  if (!state.contracts[bookingId]) {
    state.contracts[bookingId] = { templateId: defaultTemplateId, content: defaultContent, status: 'brouillon', sentAt: null }
  } else if (state.contracts[bookingId].content == null) {
    // Contrat de l'historique (déjà signé) : le texte est généré à la première ouverture.
    state.contracts[bookingId] = { ...state.contracts[bookingId], templateId: defaultTemplateId, content: defaultContent }
  }
  return state.contracts[bookingId]
}

export function setContractTemplate(bookingId, templateId, content) {
  const current = state.contracts[bookingId] || { status: 'brouillon', sentAt: null }
  state = { ...state, contracts: { ...state.contracts, [bookingId]: { ...current, templateId, content } } }
  listeners.forEach(fn => fn(state))
}

export function updateContractContent(bookingId, content) {
  const current = state.contracts[bookingId] || { templateId: null, status: 'brouillon', sentAt: null }
  state = { ...state, contracts: { ...state.contracts, [bookingId]: { ...current, content } } }
  listeners.forEach(fn => fn(state))
}

export function sendContract(bookingId) {
  const current = state.contracts[bookingId]
  if (!current) return
  state = { ...state, contracts: { ...state.contracts, [bookingId]: { ...current, status: 'envoye', sentAt: '2026-07-04' } } }
  listeners.forEach(fn => fn(state))
}

// Le client a renvoyé le contrat signé : l'agence le marque comme reçu, il rejoint
// les documents de la location.
export function markContractSigned(bookingId) {
  const current = state.contracts[bookingId]
  if (!current) return
  state = { ...state, contracts: { ...state.contracts, [bookingId]: { ...current, status: 'signe', signedAt: '2026-07-04' } } }
  listeners.forEach(fn => fn(state))
}

// ── Factures ──────────────────────────────────────────────────────
export function getInvoiceTemplate(type) {
  return state.invoiceTemplates[type]
}

export function updateInvoiceTemplate(type, patch) {
  state = { ...state, invoiceTemplates: { ...state.invoiceTemplates, [type]: { ...state.invoiceTemplates[type], ...patch } } }
  listeners.forEach(fn => fn(state))
}

export function resetInvoiceTemplate(type) {
  state = { ...state, invoiceTemplates: { ...state.invoiceTemplates, [type]: getInvoiceTypeDefaults(type) } }
  listeners.forEach(fn => fn(state))
}

export function getInvoice(bookingId, defaultData) {
  if (!state.invoices[bookingId]) {
    state.invoices[bookingId] = { data: { ...defaultData, notes: '' }, status: 'brouillon', sentAt: null, paidAt: null }
  } else if (!state.invoices[bookingId].data) {
    state.invoices[bookingId] = { ...state.invoices[bookingId], data: { ...defaultData, notes: '' } }
  }
  return state.invoices[bookingId]
}

export function updateInvoiceLineItem(bookingId, lineId, field, value) {
  const current = state.invoices[bookingId]
  if (!current) return
  const lineItems = current.data.lineItems.map(li => li.id === lineId ? { ...li, [field]: value } : li)
  state = { ...state, invoices: { ...state.invoices, [bookingId]: { ...current, data: { ...current.data, lineItems } } } }
  listeners.forEach(fn => fn(state))
}

export function updateInvoiceNotes(bookingId, notes) {
  const current = state.invoices[bookingId]
  if (!current) return
  state = { ...state, invoices: { ...state.invoices, [bookingId]: { ...current, data: { ...current.data, notes } } } }
  listeners.forEach(fn => fn(state))
}

export function sendInvoice(bookingId) {
  const current = state.invoices[bookingId]
  if (!current) return
  state = { ...state, invoices: { ...state.invoices, [bookingId]: { ...current, status: 'envoyee', sentAt: '2026-07-04', templateSnapshot: state.invoiceTemplates.client } } }
  listeners.forEach(fn => fn(state))
}

export function markInvoicePaid(bookingId) {
  const current = state.invoices[bookingId]
  if (!current) return
  state = { ...state, invoices: { ...state.invoices, [bookingId]: { ...current, status: 'payee', paidAt: '2026-07-04' } } }
  listeners.forEach(fn => fn(state))
}

export function getMenageInvoice(missionKey, defaultData) {
  if (!state.menageInvoices[missionKey]) {
    state.menageInvoices[missionKey] = { data: { ...defaultData, notes: '' }, status: 'generee', paidAt: null }
  } else if (!state.menageInvoices[missionKey].data) {
    state.menageInvoices[missionKey] = { ...state.menageInvoices[missionKey], data: { ...defaultData, notes: '' } }
  }
  return state.menageInvoices[missionKey]
}

export function updateMenageInvoiceLineItem(missionKey, lineId, field, value) {
  const current = state.menageInvoices[missionKey]
  if (!current) return
  const lineItems = current.data.lineItems.map(li => li.id === lineId ? { ...li, [field]: value } : li)
  state = { ...state, menageInvoices: { ...state.menageInvoices, [missionKey]: { ...current, data: { ...current.data, lineItems } } } }
  listeners.forEach(fn => fn(state))
}

// via : 'stripe' (paiement en ligne dans Helmo → réglé automatiquement)
//     | 'manuel' (virement, chèque… l'agence coche elle-même).
// Pour l'instant le paiement Stripe est SIMULÉ (démo) : en production, c'est le webhook
// Stripe qui appellera cette fonction une fois le paiement confirmé.
export function markMenageInvoicePaid(missionKey, via = 'manuel') {
  const current = state.menageInvoices[missionKey]
  if (!current) return
  state = { ...state, menageInvoices: { ...state.menageInvoices, [missionKey]: { ...current, status: 'payee', paidAt: '2026-07-04', paidVia: via, templateSnapshot: state.invoiceTemplates.menage } } }
  listeners.forEach(fn => fn(state))
}

// by : { type: 'provider' | 'agency', name } — qui coche. Décocher efface la trace.
export function toggleMenageDone(missionKey, by = { type: 'agency', name: "l'agence" }) {
  const nowDone = !state.menageDone[missionKey]
  const meta = { ...state.menageDoneMeta }
  if (nowDone) meta[missionKey] = { ...by, at: new Date().toISOString() }
  else delete meta[missionKey]
  state = { ...state, menageDone: { ...state.menageDone, [missionKey]: nowDone }, menageDoneMeta: meta }
  listeners.forEach(fn => fn(state))
}

export function sendMenageRequest(bookingId, providerId) {
  state = { ...state, menageRequests: { ...state.menageRequests, [bookingId]: { providerId, status: 'a_confirmer', sentAt: new Date().toISOString() } } }
  listeners.forEach(fn => fn(state))
}

export function respondMenageRequest(bookingId, accept) {
  const current = state.menageRequests[bookingId]
  if (!current) return
  state = { ...state, menageRequests: { ...state.menageRequests, [bookingId]: { ...current, status: accept ? 'acceptee' : 'refusee', answeredAt: new Date().toISOString() } } }
  listeners.forEach(fn => fn(state))
}

// ── Jours off des techniciens ──────────────────────────────────────
export function isTechOff(techId, date) {
  return (state.techDaysOff[techId] || []).some(o => date >= o.start && date <= o.end)
}

export function addTechDayOff(techId, start, end, label = 'Congés') {
  if (!start) return
  const entry = { id: 'off-' + Date.now(), start, end: end && end >= start ? end : start, label }
  state = { ...state, techDaysOff: { ...state.techDaysOff, [techId]: [...(state.techDaysOff[techId] || []), entry] } }
  listeners.forEach(fn => fn(state))
}

export function removeTechDayOff(techId, offId) {
  state = { ...state, techDaysOff: { ...state.techDaysOff, [techId]: (state.techDaysOff[techId] || []).filter(o => o.id !== offId) } }
  listeners.forEach(fn => fn(state))
}

// Remplit l'historique de démo (locations passées : contrats signés, factures réglées…)
// sans écraser ce que l'utilisateur a déjà fait dans la session.
export function seedState(patch) {
  Object.entries(patch).forEach(([k, v]) => { state[k] = { ...v, ...state[k] } })
}

// Prévient tous les écrans qu'une donnée a changé (ex. nouvelle location ajoutée).
export function notifyChange() {
  state = { ...state }
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
