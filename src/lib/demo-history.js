// Historique de démo : tout ce qui s'est passé AVANT « aujourd'hui » (4 juillet 2026) est
// déjà traité, comme dans une vraie agence en cours de saison.
// - Location commencée : contrat signé, check-in fait.
// - Terminée depuis plus de 2 semaines : facture client réglée ; sinon envoyée (à encaisser).
// - Ménage passé : fait, et réglé s'il date de plus d'une semaine.
import { BOOKINGS, MENAGE_PROVIDERS } from './mock-data'
import { seedState } from './shared-state'
import { getDefaultMenageForBoat } from './menage-missions'

const TODAY = '2026-07-04'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

const contracts = {}, checkIns = {}, invoices = {}, menageDone = {}, menageDoneMeta = {}, menageInvoices = {}
BOOKINGS.forEach(b => {
  if (b.start >= TODAY) return
  contracts[b.id] = { templateId: null, content: null, status: 'signe', sentAt: addDays(b.start, -20), signedAt: addDays(b.start, -14) }
  checkIns[b.id] = { done: true, signature: true, remarks: '', missing: {} }
  const paid = b.end < addDays(TODAY, -14)
  invoices[b.id] = { data: null, status: paid ? 'payee' : 'envoyee', sentAt: addDays(b.start, -10), paidAt: paid ? addDays(b.end, 3) : null }

  if (b.options?.menage && b.end < TODAY) {
    const key = `menage-${b.id}`
    const provider = getDefaultMenageForBoat(b.boatId) || MENAGE_PROVIDERS[0]
    menageDone[key] = true
    menageDoneMeta[key] = { type: 'provider', name: provider.company, at: `${b.end}T17:${b.id.length % 6}0:00` }
    if (b.end < addDays(TODAY, -7)) menageInvoices[key] = { data: null, status: 'payee', paidAt: addDays(b.end, 5), paidVia: 'manuel' }
  }
})

seedState({ contracts, checkIns, invoices, menageDone, menageDoneMeta, menageInvoices })
