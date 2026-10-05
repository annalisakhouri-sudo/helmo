import { useState, useEffect } from 'react'
import { X, Receipt, Download, Send, CircleCheck, Euro } from 'lucide-react'
import { buildInvoiceData } from '@/lib/invoice'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'
import { getInvoice, updateInvoiceLineItem, updateInvoiceNotes, sendInvoice, markInvoicePaid, getInvoiceTemplate, subscribe } from '@/lib/shared-state'
import InvoiceSheet from './InvoiceSheet'
import { fmtDate, fmtRange } from '@/lib/dates'

export default function InvoiceModal({ booking, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const invoice = getInvoice(booking.id, buildInvoiceData(booking))
  const { data } = invoice
  // Une facture envoyée garde la trame qu'elle avait à l'envoi ; un brouillon suit la trame actuelle.
  const tpl = invoice.templateSnapshot || getInvoiceTemplate('client')
  const isSent = invoice.status === 'envoyee'
  const isPaid = invoice.status === 'payee'
  const editable = !isSent && !isPaid
  const total = data.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)

  const sheet = {
    tpl,
    invoiceNumber: data.invoiceNumber,
    date: data.date,
    from: { name: data.company.name, lines: [data.company.port, data.company.email, data.company.phone] },
    to: { name: data.client.name, lines: [data.client.email, data.client.tel] },
    subtitleLine: `${data.boatName} — du ${data.startDate} au ${data.endDate}`,
    lineItems: data.lineItems,
    total,
  }
  const download = () => downloadInvoicePdf({ ...sheet, notes: data.notes }, `facture-${booking.client.replace(/\s+/g, '-')}-${booking.id}.pdf`)

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-white px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {isPaid ? (
            <><CircleCheck size={16} className="text-teal-600" /><span className="text-xs font-medium text-teal-700">Payée le {fmtDate(invoice.paidAt)}</span></>
          ) : isSent ? (
            <><Euro size={16} className="text-amber-600" /><span className="text-xs font-medium text-amber-700">Envoyée le {fmtDate(invoice.sentAt)} — en attente de paiement</span></>
          ) : (
            <><Receipt size={14} className="text-gray-400" /><span className="text-xs text-gray-500">Brouillon — les montants sont modifiables</span></>
          )}
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <InvoiceSheet
            {...sheet}
            editable={editable}
            onAmountChange={(id, amount) => updateInvoiceLineItem(booking.id, id, 'amount', amount)}
            notesNode={editable ? (
              <textarea
                className="w-full text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600"
                rows={2}
                placeholder="Remarque optionnelle sur cette facture..."
                value={data.notes}
                onChange={e => updateInvoiceNotes(booking.id, e.target.value)}
              />
            ) : data.notes ? <p className="text-xs text-gray-500 italic">{data.notes}</p> : null}
          />
        </div>

        <div className="bg-white border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {isPaid ? (
            <button className="btn-primary flex-1 justify-center" onClick={download}><Download size={14} /> Télécharger le PDF</button>
          ) : isSent ? (
            <>
              <button className="btn-ghost" onClick={download}><Download size={14} /> Télécharger le PDF</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => markInvoicePaid(booking.id)}><CircleCheck size={14} /> Marquer comme payée</button>
            </>
          ) : (
            <button className="btn-primary flex-1 justify-center" onClick={() => { sendInvoice(booking.id); download() }}>
              <Send size={14} /> Envoyer au client (génère le PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
