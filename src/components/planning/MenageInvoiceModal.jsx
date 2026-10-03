import { useState, useEffect } from 'react'
import { X, Download, CircleCheck, Receipt } from 'lucide-react'
import { buildMenageInvoiceData } from '@/lib/menage-invoice'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'
import { getMenageInvoice, updateMenageInvoiceLineItem, markMenageInvoicePaid, getInvoiceTemplate, subscribe } from '@/lib/shared-state'
import InvoiceSheet from './InvoiceSheet'

// editable=true côté agence (peut ajuster avant règlement) ; false côté prestataire (lecture seule).
export default function MenageInvoiceModal({ mission, editable, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const invoice = getMenageInvoice(mission.key, buildMenageInvoiceData(mission))
  const { data } = invoice
  // Une facture réglée garde la trame qu'elle avait ; sinon elle suit la trame actuelle.
  const tpl = invoice.templateSnapshot || getInvoiceTemplate('menage')
  const isPaid = invoice.status === 'payee'
  const canEdit = editable && !isPaid
  const total = data.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)

  const sheet = {
    tpl,
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    from: { name: data.provider.company, lines: [data.provider.contact, data.provider.phone, data.provider.email] },
    to: { name: data.agency.name, lines: [data.agency.port] },
    subtitleLine: `${mission.boat} — prestation du ${data.missionDate}`,
    lineItems: data.lineItems,
    total,
  }
  const download = () => downloadInvoicePdf(sheet, `facture-menage-${mission.boat.replace(/\s+/g, '-')}-${mission.date}.pdf`)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-white px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {isPaid ? (
            <><CircleCheck size={16} className="text-teal-600" /><span className="text-xs font-medium text-teal-700">Réglée le {invoice.paidAt}</span></>
          ) : (
            <><Receipt size={14} className="text-gray-400" /><span className="text-xs text-gray-500">En attente de règlement</span></>
          )}
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <InvoiceSheet
            {...sheet}
            editable={canEdit}
            onAmountChange={(id, amount) => updateMenageInvoiceLineItem(mission.key, id, 'amount', amount)}
          />
        </div>

        <div className="bg-white border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={download}><Download size={14} /> Télécharger le PDF</button>
          {canEdit && (
            <button className="btn-primary flex-1 justify-center" onClick={() => markMenageInvoicePaid(mission.key)}>
              <CircleCheck size={14} /> Marquer comme réglée
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
