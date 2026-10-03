import { useState, useEffect } from 'react'
import { X, Download, CircleCheck, Receipt } from 'lucide-react'
import { buildMenageInvoiceData } from '@/lib/menage-invoice'
import { getMenageInvoice, updateMenageInvoiceLineItem, markMenageInvoicePaid, getInvoiceSettings, subscribe } from '@/lib/shared-state'

// editable=true côté agence (peut ajuster avant règlement) ; false côté prestataire (lecture seule).
export default function MenageInvoiceModal({ mission, editable, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const defaultData = buildMenageInvoiceData(mission)
  const invoice = getMenageInvoice(mission.key, defaultData)
  const { data } = invoice
  const footerNote = getInvoiceSettings().footerNote
  const isPaid = invoice.status === 'payee'
  const canEdit = editable && !isPaid
  const total = data.lineItems.reduce((sum, li) => sum + (Number(li.amount) || 0), 0)

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const left = 50, right = 545
    let y = 60

    doc.setFillColor(15, 125, 87)
    doc.rect(0, 0, 595, 90, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold')
    doc.text(`Facture ménage N° ${data.invoiceNumber}`, left, 45)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`Émise le ${data.date}`, left, 65)

    y = 120
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(data.provider.company, left, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    doc.text(data.provider.contact, left, y + 14)
    doc.text(`${data.provider.phone} — ${data.provider.email}`, left, y + 27)

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
    doc.text('FACTURÉ À', right - 150, y)
    doc.setFont('helvetica', 'normal')
    doc.text(data.agency.name, right - 150, y + 14)
    doc.text(data.agency.port, right - 150, y + 27)

    y += 55
    doc.setFillColor(15, 125, 87)
    doc.rect(left, y - 12, right - left, 20, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('DÉSIGNATION', left + 8, y + 2)
    doc.text('MONTANT', right - 60, y + 2)

    y += 20
    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal')
    data.lineItems.forEach(li => {
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

    y += 35
    doc.setFontSize(9); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'normal')
    doc.text(footerNote, left, y)

    doc.save(`facture-menage-${mission.boat.replace(/\s+/g, '-')}-${mission.date}.pdf`)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Facture ménage N° {data.invoiceNumber}</h2>
            <p className="text-navy-100 text-xs">{mission.boat} · {data.missionDate}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {isPaid ? (
            <><CircleCheck size={16} className="text-teal-600" /><span className="text-xs font-medium text-teal-700">Réglée le {invoice.paidAt}</span></>
          ) : (
            <><Receipt size={14} className="text-gray-400" /><span className="text-xs text-gray-500">En attente de règlement</span></>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">De</p>
              <p className="text-sm font-semibold text-teal-800">{data.provider.company}</p>
              <p className="text-xs text-gray-500">{data.provider.contact}</p>
              <p className="text-xs text-gray-500">{data.provider.phone}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Facturé à</p>
              <p className="text-sm font-semibold text-navy-900">{data.agency.name}</p>
              <p className="text-xs text-gray-500">{data.agency.port}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
            <div className="bg-navy-900 px-4 py-2 flex items-center justify-between">
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Désignation</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-wide">Montant</p>
            </div>
            {data.lineItems.map(li => (
              <div key={li.id} className="px-4 py-2.5 flex items-center justify-between gap-3 bg-gray-50">
                <p className="text-sm text-gray-700 flex-1">{li.label}</p>
                {canEdit ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="number"
                      className="w-20 text-sm text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy-600"
                      value={li.amount}
                      onChange={e => updateMenageInvoiceLineItem(mission.key, li.id, 'amount', Number(e.target.value) || 0)}
                    />
                    <span className="text-sm text-gray-500">€</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 flex-shrink-0">{li.amount} €</p>
                )}
              </div>
            ))}
            <div className="bg-teal-50 px-4 py-3 flex items-center justify-between border-t border-teal-100">
              <p className="text-sm font-bold text-teal-800">TOTAL TTC</p>
              <p className="text-base font-bold text-teal-800">{total} €</p>
            </div>
          </div>

          <p className="text-xs text-gray-400">{footerNote}</p>
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={downloadPdf}><Download size={14} /> Télécharger le PDF</button>
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
