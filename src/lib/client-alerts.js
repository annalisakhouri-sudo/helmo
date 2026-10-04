import { differenceInDays, parseISO } from 'date-fns'
import { CLIENTS, BOOKINGS } from './mock-data'

export const CLIENTS_TODAY = new Date('2026-07-04')

// Une alerte client n'est "urgente" (danger/warn) que si sa prochaine loc est proche.
// Source unique : utilisée par la page Clients ET par le badge du menu latéral,
// pour que les deux affichent toujours le même chiffre.
export function getClientAlerts(client, bookings = BOOKINGS) {
  const alerts = []
  const clientBookings = bookings.filter(b => client.locations.includes(b.id))
  const nextBooking = clientBookings
    .map(b => { try { return { ...b, daysUntil: differenceInDays(parseISO(b.start), CLIENTS_TODAY) } } catch { return null } })
    .filter(b => b && b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0]

  const isUrgent = nextBooking && nextBooking.daysUntil <= 7
  const isSoon = nextBooking && nextBooking.daysUntil <= 14

  if (!client.pieceId.uploaded) {
    alerts.push({ id: 'pieceId', type: isUrgent ? 'danger' : isSoon ? 'warn' : 'info', msg: "Pièce d'identité à compléter" })
  }
  if (!client.permis.uploaded && client.permis.type) {
    alerts.push({ id: 'permis', type: isSoon ? 'warn' : 'info', msg: 'Permis à uploader' })
  }
  if (client.caution.statut === 'en_attente') {
    alerts.push({ id: 'caution', type: isUrgent ? 'warn' : 'info', msg: `Caution en attente (${client.caution.montant}€)` })
  }
  return alerts
}

// Alertes urgentes (rouges) de toute la base clients — c'est ce chiffre qui s'affiche
// dans le badge du menu et dans l'en-tête de la page Clients.
export function getUrgentClientAlerts(clients = CLIENTS, bookings = BOOKINGS) {
  return clients.flatMap(c => getClientAlerts(c, bookings).map(a => ({ ...a, client: c })))
    .filter(a => a.type === 'danger')
}

// ── Mise à jour d'un client (doc uploadé, caution reçue…) ──────────────
// Modifie la fiche en mémoire et prévient les écrans abonnés (liste Clients,
// badge du menu) pour que le compteur baisse immédiatement.
// En production : écriture Supabase + realtime.
let listeners = []

export function updateClient(client, patch) {
  Object.assign(client, patch)
  listeners.forEach(fn => fn())
}

export function subscribeClients(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
