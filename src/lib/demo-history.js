// Historique de démo : tout ce qui s'est passé AVANT « aujourd'hui » (4 juillet 2026) est
// déjà traité, comme dans une vraie agence en cours de saison.
// - Location commencée : contrat signé, check-in fait.
// - Facture client : réglée avant le départ (quelques retards récents) ; départs sous 30 jours : envoyée.
// - Ménage passé : fait, et réglé s'il date de plus d'une semaine.
import { BOOKINGS, MENAGE_PROVIDERS } from './mock-data'
import { seedState } from './shared-state'
import { getDefaultMenageForBoat } from './menage-missions'

const TODAY = '2026-07-04'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

const contracts = {}, checkIns = {}, invoices = {}, menageDone = {}, menageDoneMeta = {}, menageInvoices = {}
let lateCount = 0
BOOKINGS.forEach(b => {
  // Départ dans les 30 jours : facture envoyée, le client doit payer avant de partir.
  if (b.start >= TODAY && b.start < addDays(TODAY, 30)) {
    invoices[b.id] = { data: null, status: 'envoyee', sentAt: addDays(b.start, -30), paidAt: null }
    return
  }
  if (b.start >= TODAY) return
  contracts[b.id] = { templateId: null, content: null, status: 'signe', sentAt: addDays(b.start, -20), signedAt: addDays(b.start, -14) }
  checkIns[b.id] = { done: true, signature: true, remarks: '', missing: {} }
  // Passé : réglé avant le départ… sauf quelques retards récents (réalistes, à relancer).
  const late = b.start >= addDays(TODAY, -21) && lateCount < 4 && Number(b.id.slice(3)) % 5 === 0
  if (late) lateCount++
  invoices[b.id] = { data: null, status: late ? 'envoyee' : 'payee', sentAt: addDays(b.start, -30), paidAt: late ? null : addDays(b.start, -3) }

  // Date du ménage : jour du retour, ou la veille si le client libère le vendredi soir.
  const menageDate = b.start !== b.end && b.lastNightAboard === false ? addDays(b.end, -1) : b.end
  if (b.options?.menage && menageDate < TODAY) {
    const key = `menage-${b.id}`
    const provider = getDefaultMenageForBoat(b.boatId) || MENAGE_PROVIDERS[0]
    menageDone[key] = true
    menageDoneMeta[key] = { type: 'provider', name: provider.company, at: `${menageDate}T17:${b.id.length % 6}0:00` }
    if (menageDate < addDays(TODAY, -7)) menageInvoices[key] = { data: null, status: 'payee', paidAt: addDays(b.end, 5), paidVia: 'manuel' }
  }
})

seedState({ contracts, checkIns, invoices, menageDone, menageDoneMeta, menageInvoices })
