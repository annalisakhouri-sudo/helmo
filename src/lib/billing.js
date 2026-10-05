// Pôle facturation : TOUTES les factures de l'agence au même endroit, avec un seul circuit.
// - Clients (ce qu'on encaisse) : prevue → envoyee → reglee
// - Prestataires (ce qu'on paie : ménage, skippers) : a_venir → a_payer → reglee
import { BOOKINGS, SKIPPERS } from './mock-data'
import { getState } from './shared-state'
import { buildInvoiceData } from './invoice'
import { buildAllMenageMissions } from './menage-missions'

export const TODAY = '2026-07-04'
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const sum = items => items.reduce((n, li) => n + (Number(li.amount) || 0), 0)

// Factures clients : une par location, à régler avant le départ.
export function getClientBills(brand) {
  const invoices = getState().invoices
  return BOOKINGS.filter(b => !brand || b.brand === brand).map(b => {
    const inv = invoices[b.id]
    const amount = inv?.data ? sum(inv.data.lineItems) : sum(buildInvoiceData(b).lineItems)
    const status = inv?.status === 'payee' ? 'reglee' : inv?.status === 'envoyee' ? 'envoyee' : 'prevue'
    return {
      key: 'cli-' + b.id, kind: 'client', booking: b,
      who: b.client, what: b.boatName, date: b.start, due: b.start, amount, status,
      // En retard : envoyée, et le départ est déjà passé sans paiement.
      late: status === 'envoyee' && b.start < TODAY,
      sentAt: inv?.sentAt || null, paidAt: inv?.paidAt || null,
    }
  })
}

// Ce que l'agence doit à ses prestataires : ménages + skippers.
export function getProviderBills(brand) {
  const st = getState()
  const menages = buildAllMenageMissions()
    .filter(m => (!brand || m.agencyBrand === brand) && m.requestStatus === 'acceptee')
    .map(m => ({
      key: 'men-' + m.key, kind: 'menage', mission: m,
      who: m.providerName, what: `Ménage · ${m.boat}`, date: m.date, due: addDays(m.date, 30), amount: m.amount,
      status: m.status === 'regle' ? 'reglee' : m.status === 'fait' ? 'a_payer' : 'a_venir',
      paidAt: m.paidAt,
    }))

  const skippers = BOOKINGS
    .filter(b => (!brand || b.brand === brand) && b.skipperId)
    .map(b => {
      const s = SKIPPERS.find(x => x.id === b.skipperId)
      const days = Math.max(1, Math.round((new Date(b.end) - new Date(b.start)) / 86400000))
      const paid = st.skipperPayments[b.id] || (b.end < addDays(TODAY, -14) ? { paidAt: addDays(b.end, 7), via: 'manuel' } : null)
      return {
        key: 'skp-' + b.id, kind: 'skipper', booking: b,
        who: s?.name || b.skipperName, what: `Skipper · ${b.boatName}`, date: b.end, due: addDays(b.end, 15),
        amount: days * (s?.rate || 0),
        status: paid ? 'reglee' : b.end < TODAY ? 'a_payer' : 'a_venir',
        paidAt: paid?.paidAt || null,
      }
    })

  return [...menages, ...skippers]
}

// Chiffres du haut + barres par mois (sur la période choisie).
export function summarize(clientBills, providerBills) {
  const t = (arr, f) => arr.filter(f).reduce((n, x) => n + x.amount, 0)
  return {
    encaisse: t(clientBills, x => x.status === 'reglee'),
    aEncaisser: t(clientBills, x => x.status === 'envoyee'),
    enRetard: t(clientBills, x => x.late),
    prevu: t(clientBills, x => x.status === 'prevue'),
    aPayer: t(providerBills, x => x.status === 'a_payer'),
    paye: t(providerBills, x => x.status === 'reglee'),
  }
}

export function toCsv(rows) {
  const head = ['Date', 'Qui', 'Objet', 'Montant (€)', 'Statut', 'Réglé le']
  const lines = rows.map(r => [r.date, r.who, r.what, r.amount, r.status, r.paidAt || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
  return [head.join(';'), ...lines].join('\n')
}
