import { format } from 'date-fns'
import { BRANDS, MENAGE_PROVIDERS, MENAGE_INVOICE_TEMPLATE } from './mock-data'

const TODAY = new Date('2026-07-04')

export function buildMenageInvoiceNumber(mission) {
  return `MEN-${mission.date.replace(/-/g, '')}-${mission.bookingId.slice(-4).toUpperCase()}`
}

export function buildMenageInvoiceContent(mission, paymentStatus = 'En attente') {
  const provider = MENAGE_PROVIDERS.find(p => p.id === mission.providerId)
  const brand = BRANDS[mission.agencyBrand]

  const tokens = {
    invoice_number: buildMenageInvoiceNumber(mission),
    today: format(TODAY, 'dd/MM/yyyy'),
    provider_company: provider?.company || '',
    provider_contact: provider?.contact || '',
    provider_phone: provider?.phone || '',
    provider_email: provider?.email || '',
    agency_name: brand?.name || mission.agencyName || '',
    agency_port: brand?.port || '',
    boat_name: mission.boat,
    mission_date: format(new Date(mission.date), 'dd/MM/yyyy'),
    price: `${mission.price} €`,
    payment_status: paymentStatus,
  }

  let content = MENAGE_INVOICE_TEMPLATE
  Object.entries(tokens).forEach(([key, val]) => {
    content = content.split(`{{${key}}}`).join(val ?? '')
  })
  return content
}
