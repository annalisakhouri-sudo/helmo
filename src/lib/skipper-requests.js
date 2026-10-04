// Chaîne skipper : demande → réponse → affectation à la location.
// 1. L'agence envoie une demande pour une location (fiche location ou page Skippers).
// 2. Le skipper accepte / refuse depuis son espace.
// 3. Accepté → le skipper est affecté à la location (planning, fiche, techniciens à jour).
import { SKIPPERS, BOOKINGS } from './mock-data'
import { sendMessage } from './messaging'

// requests : bookingId -> { skipperId, status: 'en_attente' | 'acceptee' | 'refusee', sentAt }
let requests = {}
let listeners = []
const notify = () => listeners.forEach(fn => fn())

export function subscribeSkipperRequests(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

export function getRequest(bookingId) {
  return requests[bookingId] || null
}

export function getRequestsForSkipper(skipperId, status) {
  return Object.entries(requests)
    .filter(([, r]) => r.skipperId === skipperId && (!status || r.status === status))
    .map(([bookingId, r]) => ({ ...r, booking: BOOKINGS.find(b => b.id === bookingId) }))
    .filter(r => r.booking)
}

const fmt = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

// Locations qui attendent un skipper (sans skipper et sans demande en cours).
export function getBookingsNeedingSkipper(brand) {
  return BOOKINGS
    .filter(b => b.needsSkipper && !b.skipperId && !b.skipperName && (!brand || b.brand === brand))
    .filter(b => requests[b.id]?.status !== 'en_attente')
    .sort((a, b) => a.start.localeCompare(b.start))
}

// Un skipper est libre s'il n'a aucune autre location (ou demande en attente) sur ces dates.
export function isSkipperFree(skipperId, booking) {
  const overlaps = o => o.id !== booking.id && o.start < booking.end && o.end > booking.start
  const busyBooking = BOOKINGS.some(o => o.skipperId === skipperId && overlaps(o))
  const busyRequest = Object.entries(requests).some(([bid, r]) => {
    const o = BOOKINGS.find(x => x.id === bid)
    return r.skipperId === skipperId && r.status === 'en_attente' && o && overlaps(o)
  })
  return !busyBooking && !busyRequest
}

export function buildRequestMessage(skipper, booking, agencyName = 'Midi Nautisme') {
  const days = Math.max(1, Math.round((new Date(booking.end) - new Date(booking.start)) / 86400000))
  return `Bonjour ${skipper.name.split(' ')[0]},\n\nNous souhaiterions vous réserver sur le ${booking.boatName} du ${fmt(booking.start)} au ${fmt(booking.end)} (${days} jour${days > 1 ? 's' : ''}), pour ${booking.guests}.\n\nTarif : ${skipper.rate}€/j\n\nPouvez-vous confirmer votre disponibilité ?\n\n${agencyName}`
}

export function sendSkipperRequest(booking, skipperId, message) {
  requests = { ...requests, [booking.id]: { skipperId, status: 'en_attente', sentAt: new Date().toISOString() } }
  // La demande arrive aussi dans la messagerie du skipper.
  sendMessage(skipperId, 'agency', message || buildRequestMessage(SKIPPERS.find(s => s.id === skipperId), booking), { requestBookingId: booking.id })
  notify()
}

export function cancelSkipperRequest(bookingId) {
  const { [bookingId]: _, ...rest } = requests
  requests = rest
  notify()
}

export function respondSkipperRequest(bookingId, accept) {
  const r = requests[bookingId]
  const booking = BOOKINGS.find(b => b.id === bookingId)
  if (!r || !booking) return
  const skipper = SKIPPERS.find(s => s.id === r.skipperId)
  requests = { ...requests, [bookingId]: { ...r, status: accept ? 'acceptee' : 'refusee', answeredAt: new Date().toISOString() } }
  if (accept && skipper) {
    // Affectation réelle sur la location : planning, fiche, alertes « skipper manquant » à jour.
    booking.skipperId = skipper.id
    booking.skipperName = skipper.name
    booking.skipperInitials = skipper.initials
    booking.skipperPhone = skipper.phone
    booking.clientIsSkipper = false
    if (booking.status === 'skipper-missing') { booking.status = 'confirmed'; booking.color = 'teal' } // le bloc repasse en vert au planning
  }
  sendMessage(r.skipperId, 'skipper',
    accept ? `✓ J'accepte la mission ${booking.boatName} du ${fmt(booking.start)} au ${fmt(booking.end)}.` : `Désolé, je ne suis pas disponible pour le ${booking.boatName} du ${fmt(booking.start)}.`)
  notify()
}
