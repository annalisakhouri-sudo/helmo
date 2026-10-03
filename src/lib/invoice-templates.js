// Trames de factures : un modèle par type de facture, modifiable dans Options & tarifs → Facturation.
// Pour ajouter un type plus tard (ex : facture skipper), il suffit d'ajouter une entrée ici.

export const ACCENT_COLORS = [
  { id: 'navy', label: 'Bleu marine', hex: '#042C53' },
  { id: 'blue', label: 'Bleu', hex: '#185FA5' },
  { id: 'teal', label: 'Vert', hex: '#0F7D57' },
  { id: 'slate', label: 'Anthracite', hex: '#374151' },
  { id: 'wine', label: 'Bordeaux', hex: '#7A1F3D' },
]

const BASE = {
  fromLabel: 'De',
  toLabel: 'Facturé à',
  designationLabel: 'Désignation',
  amountLabel: 'Montant',
  totalLabel: 'TOTAL TTC',
  showSubtitleLine: true, // ligne "bateau / dates" sous les blocs De / Facturé à
  paymentTerms: '',       // ex : paiement sous 30 jours par virement…
  legalMentions: '',      // ex : raison sociale, SIRET, TVA…
  footerNote: 'Merci de votre confiance.',
}

export const INVOICE_TYPES = [
  { id: 'client', label: 'Facture client', sub: 'Agence → locataire', defaults: { ...BASE, title: 'Facture', accent: '#042C53' } },
  { id: 'menage', label: 'Facture ménage', sub: 'Société de ménage → agence', defaults: { ...BASE, title: 'Facture ménage', accent: '#0F7D57' } },
]

export function getInvoiceTypeDefaults(id) {
  return { ...(INVOICE_TYPES.find(t => t.id === id)?.defaults || BASE) }
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
