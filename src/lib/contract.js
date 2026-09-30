import { format } from 'date-fns'
import { BRANDS, CLIENTS, BOATS, OPTIONS_CATALOG, PRICING_PERIODS, BOAT_PRICES, CONTRACT_TEMPLATES } from './mock-data'

const TODAY = new Date('2026-07-04')

function computePrice(boatId, startDate) {
  const period = PRICING_PERIODS.find(p => startDate >= p.start && startDate <= p.end)
  const price = period && BOAT_PRICES[boatId]?.[period.id]
  return price ? `${price} € / semaine` : 'À définir avec l\'agence'
}

// Choisit le modèle le plus adapté par défaut : bateau avec cabines → contrat standard,
// day boat (semi-rigide/moteur sans cabine) → contrat journée.
export function getDefaultTemplateId(boat) {
  return boat?.cabines === 0 ? 'tpl-day' : 'tpl-standard'
}

export function buildContractContent(booking, templateId) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  const brand = BRANDS[booking.brand]
  const client = CLIENTS.find(c => c.id === booking.clientId) || CLIENTS.find(c => c.locations?.includes(booking.id))
  const template = CONTRACT_TEMPLATES.find(t => t.id === templateId) || CONTRACT_TEMPLATES[0]

  // Pour une location tout juste créée, le client n'existe pas encore dans la table
  // CLIENTS — on retombe sur les infos saisies directement sur la location.
  const fullName = (booking.client || '').trim().split(' ')
  const fallbackPrenom = fullName.slice(0, -1).join(' ') || fullName[0] || ''
  const fallbackNom = fullName.length > 1 ? fullName[fullName.length - 1] : ''

  const optionsList = Object.entries(booking.options || {})
    .filter(([, v]) => v)
    .map(([id, val]) => {
      const opt = OPTIONS_CATALOG.find(o => o.id === id)
      if (!opt) return null
      const qty = typeof val === 'object' ? val.qty : null
      return `- ${opt.label}${qty ? ` × ${qty}` : ''}`
    })
    .filter(Boolean)
  const drapsList = (booking.draps || []).map(d => `- Draps ${d.name} × ${d.qty} ${d.unit}`)
  const allOptions = [...optionsList, ...drapsList]

  const tokens = {
    company_name: brand?.name || '',
    company_port: brand?.port || '',
    company_phone: brand?.phone || '',
    company_email: brand?.email || '',
    client_nom: client?.nom || fallbackNom,
    client_prenom: client?.prenom || fallbackPrenom,
    client_naissance: client?.naissance || 'Non renseignée',
    client_nationalite: client?.nationalite || 'Non renseignée',
    client_piece_numero: client?.pieceId?.numero || 'Non renseigné',
    client_permis_type: client?.permis?.type || 'Non renseigné',
    client_permis_numero: client?.permis?.numero || 'Non renseigné',
    client_tel: client?.tel || booking.phone || '',
    client_email: client?.email || 'Non renseigné',
    boat_name: boat?.name || booking.boatName,
    boat_type: boat?.type || '',
    boat_length: boat?.length || '',
    boat_capacite: boat?.capacite || '',
    start_date: booking.start,
    end_date: booking.end,
    guests: booking.guests || 'Non renseigné',
    skipper_info: booking.skipperName || 'Sans skipper (locataire navigue seul)',
    price: computePrice(booking.boatId, booking.start),
    caution_montant: client?.caution?.montant ? `${client.caution.montant} €` : 'Non renseignée',
    caution_mode: client?.caution?.mode || 'Non renseigné',
    options_list: allOptions.length > 0 ? allOptions.join('\n') : 'Aucune option supplémentaire',
    today: format(TODAY, 'dd/MM/yyyy'),
  }

  let content = template.body
  Object.entries(tokens).forEach(([key, val]) => {
    content = content.split(`{{${key}}}`).join(val ?? '')
  })
  return content
}
