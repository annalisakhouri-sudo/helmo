import { format } from 'date-fns'
import { BRANDS, MENAGE_PROVIDERS } from './mock-data'

const TODAY = new Date('2026-07-04')

export function buildMenageInvoiceNumber(mission) {
  return `MEN-${mission.date.replace(/-/g, '')}-${mission.bookingId.replace(/^bk-/, '').padStart(3, '0').toUpperCase()}`
}

// Données structurées (pas un bloc de texte) pour un vrai rendu de facture.
export function buildMenageInvoiceData(mission) {
  const provider = MENAGE_PROVIDERS.find(p => p.id === mission.providerId)
  const brand = BRANDS[mission.agencyBrand]

  return {
    invoiceNumber: buildMenageInvoiceNumber(mission),
    date: format(TODAY, 'dd/MM/yyyy'),
    provider: {
      company: provider?.company || '',
      contact: provider?.contact || '',
      phone: provider?.phone || '',
      email: provider?.email || '',
    },
    agency: {
      name: brand?.name || mission.agencyName || '',
      port: brand?.port || '',
    },
    lineItems: [
      { id: 'menage', label: `Nettoyage — ${mission.boat}`, amount: mission.price, editable: true },
    ],
    missionDate: format(new Date(mission.date), 'dd/MM/yyyy'),
  }
}
