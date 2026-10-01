import { useState, useEffect } from 'react'
import { X, Receipt, Download, Send, CircleCheck, Euro } from 'lucide-react'
import { buildInvoiceContent } from '@/lib/invoice'
import { getInvoice, updateInvoiceContent, sendInvoice, markInvoicePaid, subscribe } from '@/lib/shared-state'

export default function InvoiceModal({ booking, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const defaultContent = buildInvoiceContent(booking)
  const invoice = getInvoice(booking.id, defaultContent)
  const isSent = invoice.status === 'envoyee'
  const isPaid = invoice.status === 'payee'

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 50
    const lines = doc.splitTextToSize(invoice.content, 495)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let y = margin
    lines.forEach(line => {
      if (y > 780) { doc.addPage(); y = margin }
      doc.text(line, margin, y)
      y += 14
    })
    doc.save(`facture-${booking.client.replace(/\s+/g, '-')}-${booking.id}.pdf`)
  }

  function handleSend() {
    sendInvoice(booking.id)
    downloadPdf()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Facture</h2>
            <p className="text-navy-100 text-xs">{booking.boatName} — {booking.client}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {isPaid ? (
            <><CircleCheck size={16} className="text-teal-600" /><span className="text-xs font-medium text-teal-700">Payée le {invoice.paidAt}</span></>
          ) : isSent ? (
            <><Euro size={16} className="text-amber-600" /><span className="text-xs font-medium text-amber-700">Envoyée le {invoice.sentAt} — en attente de paiement</span></>
          ) : (
            <><Receipt size={14} className="text-gray-400" /><span className="text-xs text-gray-500">Brouillon — modifiable avant envoi</span></>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isSent || isPaid ? (
            <pre className="text-xs whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 leading-relaxed">{invoice.content}</pre>
          ) : (
            <textarea
              className="w-full h-full min-h-[400px] text-xs border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed font-sans"
              value={invoice.content}
              onChange={e => updateInvoiceContent(booking.id, e.target.value)}
            />
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {isPaid ? (
            <button className="btn-primary flex-1 justify-center" onClick={downloadPdf}>
              <Download size={14} /> Télécharger le PDF
            </button>
          ) : isSent ? (
            <>
              <button className="btn-ghost" onClick={downloadPdf}><Download size={14} /> Télécharger le PDF</button>
              <button className="btn-primary flex-1 justify-center" onClick={() => markInvoicePaid(booking.id)}>
                <CircleCheck size={14} /> Marquer comme payée
              </button>
            </>
          ) : (
            <button className="btn-primary flex-1 justify-center" onClick={handleSend}>
              <Send size={14} /> Envoyer au client (génère le PDF)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
