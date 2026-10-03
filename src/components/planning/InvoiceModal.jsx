import { useState, useEffect } from 'react'
import { X, Receipt, Download, Send, CircleCheck, Euro, Plus, Trash2 } from 'lucide-react'
import { buildInvoiceData } from '@/lib/invoice'
import { getInvoice, updateInvoiceLineItem, updateInvoiceNotes, sendInvoice, markInvoicePaid, getInvoiceSettings, subscribe } from '@/lib/shared-state'

export default function InvoiceModal({ booking, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const defaultData = buildInvoiceData(booking)
  const invoice = getInvoice(booking.id, defaultData)
  const { data } = invoice
  const footerNote = getInvoiceSettings().footerNote
  const isSent = invoice.status === 'envoyee'
  const isPaid = invoice.status === 'payee'
  const editable = !isSent && !isPaid
  const total = data.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const left = 50, right = 545
    let y = 60

    doc.setFillColor(4, 44, 83)
    doc.rect(0, 0, 595, 90, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(`Facture N° ${data.invoiceNumber}`, left, 45)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Émise le ${data.date}`, left, 65)

    y = 120
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(data.company.name, left, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(data.company.port, left, y + 14)
    doc.text(`${data.company.email} — ${data.company.phone}`, left, y + 27)

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('FACTURÉ À', right - 150, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.client.name, right - 150, y + 14)
    doc.text(data.client.email, right - 150, y + 27)
    doc.text(data.client.tel, right - 150, y + 40)

    y += 70
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    doc.text(`${data.boatName} — du ${data.startDate} au ${data.endDate}`, left, y)

    y += 25
    doc.setFillColor(4, 44, 83)
    doc.rect(left, y - 12, right - left, 20, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('DÉSIGNATION', left + 8, y + 2)
    doc.text('MONTANT', right - 60, y + 2)

    y += 20
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal')
    data.lineItems.forEach((li, i) => {
      doc.setFillColor(i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 251 : 255)
      doc.rect(left, y - 12, right - left, 20, 'F')
      doc.text(li.label, left + 8, y + 2)
      doc.text(`${li.amount} €`, right - 60, y + 2)
      y += 20
    })

    y += 10
    doc.setDrawColor(200, 200, 200)
    doc.line(left, y - 14, right, y - 14)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('TOTAL TTC', left + 8, y)
    doc.text(`${total} €`, right - 60, y)

    if (data.notes) {
      y += 30
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      doc.text(doc.splitTextToSize(data.notes, right - left), left, y)
      y += 20
    }

    y += 30
    doc.setFontSize(9); doc.setTextColor(120, 120, 120)
    doc.text(footerNote, left, y)

    doc.save(`facture-${booking.client.replace(/\s+/g, '-')}-${booking.id}.pdf`)
  }

  function handleSend() {
    sendInvoice(booking.id)
    downloadPdf()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Facture N° {data.invoiceNumber}</h2>
            <p className="text-navy-100 text-xs">Émise le {data.date}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {isPaid ? (
            <><CircleCheck size={16} className="text-teal-600" /><span className="text-xs font-medium text-teal-700">Payée le {invoice.paidAt}</span></>
          ) : isSent ? (
            <><Euro size={16} className="text-amber-600" /><span className="text-xs font-medium text-amber-700">Envoyée le {invoice.sentAt} — en attente de paiement</span></>
          ) : (
            <><Receipt size={14} className="text-gray-400" /><span className="text-xs text-gray-500">Brouillon — les montants sont modifiables</span></>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">De</p>
              <p className="text-sm font-semibold text-navy-900">{data.company.name}</p>
              <p className="text-xs text-gray-500">{data.company.port}</p>
              <p className="text-xs text-gray-500">{data.company.email}</p>
              <p className="text-xs text-gray-500">{data.company.phone}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Facturé à</p>
              <p className="text-sm font-semibold text-navy-900">{data.client.name}</p>
              <p className="text-xs text-gray-500">{data.client.email}</p>
              <p className="text-xs text-gray-500">{data.client.tel}</p>
            </div>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-3">{data.boatName} — du {data.startDate} au {data.endDate}</p>

          <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
            <div className="bg-navy-900 px-4 py-2 flex items-center justify-between">
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Désignation</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Montant</p>
            </div>
            {data.lineItems.map((li, i) => (
              <div key={li.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                <p className="text-sm text-gray-700 flex-1">{li.label}</p>
                {editable ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      className="w-20 text-sm text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy-600"
                      value={li.amount}
                      onChange={e => updateInvoiceLineItem(booking.id, li.id, 'amount', Number(e.target.value) || 0)}
                    />
                    <span className="text-sm text-gray-500">€</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 flex-shrink-0">{li.amount} €</p>
                )}
              </div>
            ))}
            <div className="bg-navy-50 px-4 py-3 flex items-center justify-between border-t border-navy-100">
              <p className="text-sm font-bold text-navy-900">TOTAL TTC</p>
              <p className="text-base font-bold text-navy-900">{total} €</p>
            </div>
          </div>

          {editable ? (
            <textarea
              className="w-full text-xs border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600"
              rows={2}
              placeholder="Remarque optionnelle sur cette facture..."
              value={data.notes}
              onChange={e => updateInvoiceNotes(booking.id, e.target.value)}
            />
          ) : data.notes ? (
            <p className="text-xs text-gray-500 italic">{data.notes}</p>
          ) : null}

          <p className="text-xs text-gray-400 mt-4">{footerNote}</p>
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
