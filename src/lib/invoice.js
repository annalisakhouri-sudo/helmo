import { format } from 'date-fns'
import { BRANDS, CLIENTS, BOATS, OPTIONS_CATALOG, PRICING_PERIODS, BOAT_PRICES } from './mock-data'

const TODAY = new Date('2026-07-04')

// La grille saisonnière se répète chaque année (2027 = mêmes périodes que 2026).
function weeklyPrice(boatId, startDate) {
  const d = '2026' + startDate.slice(4)
  const period = PRICING_PERIODS.find(p => d >= p.start && d <= p.end)
  return period && BOAT_PRICES[boatId]?.[period.id] ? BOAT_PRICES[boatId][period.id] : null
}

// Prix de la location : à la semaine (× nombre de semaines) ou à la journée (≈ 1/5 de la semaine).
export function computeRentalPrice(booking) {
  const weekly = weeklyPrice(booking.boatId, booking.start)
  if (weekly == null) return null
  if (booking.start === booking.end) return Math.round(weekly / 5 / 10) * 10
  const days = Math.max(1, Math.round((new Date(booking.end) - new Date(booking.start)) / 86400000))
  return Math.round(weekly * days / 7)
}

export function buildInvoiceNumber(booking) {
  return `HLM-${booking.start.replace(/-/g, '')}-${booking.id.replace(/^bk-/, '').padStart(3, '0').toUpperCase()}`
}

// Retourne des données STRUCTURÉES (pas un bloc de texte) pour un vrai rendu visuel,
// et pour pouvoir éditer chaque ligne individuellement.
export function buildInvoiceData(booking) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  const brand = BRANDS[booking.brand]
  const client = CLIENTS.find(c => c.id === booking.clientId) || CLIENTS.find(c => c.locations?.includes(booking.id))
  const fullName = (booking.client || '').trim().split(' ')
  const fallbackPrenom = fullName.slice(0, -1).join(' ') || fullName[0] || ''
  const fallbackNom = fullName.length > 1 ? fullName[fullName.length - 1] : ''

  const basePrice = computeRentalPrice(booking)
  const isDay = booking.start === booking.end
  const nbWeeks = Math.max(1, Math.round((new Date(booking.end) - new Date(booking.start)) / (7 * 86400000)))
  const lineItems = []

  lineItems.push({
    id: 'base',
    label: `Location ${boat?.name || booking.boatName} (${isDay ? 'journée' : nbWeeks > 1 ? `${nbWeeks} semaines` : 'semaine'})`,
    amount: basePrice ?? 0,
    editable: true,
  })

  Object.entries(booking.options || {}).forEach(([optId, val]) => {
    if (!val) return
    const opt = OPTIONS_CATALOG.find(o => o.id === optId)
    if (!opt) return
    const qty = typeof val === 'object' ? (val.qty || 1) : 1
    lineItems.push({
      id: optId,
      label: qty > 1 ? `${opt.label} × ${qty}` : opt.label,
      amount: opt.price * qty,
      editable: true,
    })
  })

  return {
    invoiceNumber: buildInvoiceNumber(booking),
    date: format(TODAY, 'dd/MM/yyyy'),
    company: {
      name: brand?.name || '',
      port: brand?.port || '',
      email: brand?.email || '',
      phone: brand?.phone || '',
    },
    client: {
      name: client ? `${client.prenom} ${client.nom}` : `${fallbackPrenom} ${fallbackNom}`.trim(),
      email: client?.email || 'Non renseigné',
      tel: client?.tel || booking.phone || '',
    },
    boatName: boat?.name || booking.boatName,
    startDate: booking.start,
    endDate: booking.end,
    lineItems,
    paymentMode: 'Non renseigné',
    priceUnknown: !basePrice,
  }
}
