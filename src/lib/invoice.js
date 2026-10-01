import { format, differenceInCalendarDays } from 'date-fns'
import { BRANDS, CLIENTS, BOATS, OPTIONS_CATALOG, PRICING_PERIODS, BOAT_PRICES, INVOICE_TEMPLATE } from './mock-data'

const TODAY = new Date('2026-07-04')

function computeBasePrice(boatId, startDate) {
  const period = PRICING_PERIODS.find(p => startDate >= p.start && startDate <= p.end)
  return period && BOAT_PRICES[boatId]?.[period.id] ? BOAT_PRICES[boatId][period.id] : null
}

export function buildInvoiceNumber(booking) {
  return `HLM-${booking.start.replace(/-/g, '')}-${booking.id.slice(-4).toUpperCase()}`
}

export function buildInvoiceContent(booking) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  const brand = BRANDS[booking.brand]
  const client = CLIENTS.find(c => c.id === booking.clientId) || CLIENTS.find(c => c.locations?.includes(booking.id))
  const fullName = (booking.client || '').trim().split(' ')
  const fallbackPrenom = fullName.slice(0, -1).join(' ') || fullName[0] || ''
  const fallbackNom = fullName.length > 1 ? fullName[fullName.length - 1] : ''

  const basePrice = computeBasePrice(booking.boatId, booking.start)
  const lines = []
  let total = 0

  if (basePrice) {
    lines.push(`Location ${boat?.name || booking.boatName} (semaine)`.padEnd(45) + `${basePrice} €`)
    total += basePrice
  } else {
    lines.push(`Location ${boat?.name || booking.boatName} — prix à confirmer avec l'agence`)
  }

  Object.entries(booking.options || {}).forEach(([optId, val]) => {
    if (!val) return
    const opt = OPTIONS_CATALOG.find(o => o.id === optId)
    if (!opt) return
    const qty = typeof val === 'object' ? (val.qty || 1) : 1
    const lineTotal = opt.price * qty
    lines.push(`${opt.label}${qty > 1 ? ` × ${qty}` : ''}`.padEnd(45) + `${lineTotal} €`)
    total += lineTotal
  })

  const tokens = {
    invoice_number: buildInvoiceNumber(booking),
    today: format(TODAY, 'dd/MM/yyyy'),
    company_name: brand?.name || '',
    company_port: brand?.port || '',
    company_email: brand?.email || '',
    company_phone: brand?.phone || '',
    client_prenom: client?.prenom || fallbackPrenom,
    client_nom: client?.nom || fallbackNom,
    client_email: client?.email || 'Non renseigné',
    client_tel: client?.tel || booking.phone || '',
    boat_name: boat?.name || booking.boatName,
    start_date: booking.start,
    end_date: booking.end,
    line_items: lines.join('\n'),
    total_price: basePrice ? `${total} €` : 'À confirmer',
    payment_mode: 'Non renseigné',
    payment_status: 'En attente',
  }

  let content = INVOICE_TEMPLATE
  Object.entries(tokens).forEach(([key, val]) => {
    content = content.split(`{{${key}}}`).join(val ?? '')
  })
  return content
}
