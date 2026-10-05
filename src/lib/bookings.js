// Création d'une location : UN seul point d'entrée, pour que tous les modules la voient
// (planning, tableau de bord, fiche client, missions techniciens, ménage).
// Avant, la nouvelle location ne vivait que dans l'écran Planning et disparaissait ailleurs.
import { BOOKINGS, CLIENTS } from './mock-data'
import { sendMenageRequest, notifyChange } from './shared-state'
import { updateClient } from './client-alerts'

export function addBooking(booking, clientInfo = {}) {
  BOOKINGS.push(booking)

  // Rattachement à la fiche client (création si c'est un nouveau client).
  const nom = clientInfo.nom || booking.client.split(' ')[0]
  const prenom = clientInfo.prenom || booking.client.split(' ').slice(1).join(' ')
  let client = (booking.clientId && CLIENTS.find(c => c.id === booking.clientId)) || CLIENTS.find(c => `${c.prenom} ${c.nom}`.toLowerCase() === booking.client.toLowerCase() || `${c.nom} ${c.prenom}`.toLowerCase() === booking.client.toLowerCase())
  if (client) {
    updateClient(client, { locations: [...client.locations, booking.id] })
  } else {
    client = {
      id: 'cli-new-' + Date.now(),
      nom, prenom,
      tel: booking.phone || '', email: clientInfo.email || '', tel2: '',
      naissance: '', nationalite: '',
      pieceId: { numero: '', type: 'CNI', uploaded: false },
      permis: { numero: '', type: '', uploaded: false },
      caution: { montant: 0, mode: '', statut: 'en_attente' },
      notes: '',
      locations: [booking.id],
    }
    CLIENTS.push(client)
    updateClient(client, {})
  }
  booking.clientId = client.id

  // Ménage : la demande (avec sa facture à confirmer) part à la société choisie.
  if (booking.options?.menage && booking.menageProviderId) {
    sendMenageRequest(booking.id, booking.menageProviderId)
  }

  notifyChange()
  return booking
}
