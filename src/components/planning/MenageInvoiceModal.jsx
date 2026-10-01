import { useState, useEffect } from 'react'
import { X, Download, CircleCheck, Receipt } from 'lucide-react'
import { buildMenageInvoiceContent } from '@/lib/menage-invoice'
import { getMenageInvoice, updateMenageInvoiceContent, markMenageInvoicePaid, subscribe } from '@/lib/shared-state'

// editable=true côté agence (peut ajuster avant règlement) ; false côté prestataire (lecture seule).
export default function MenageInvoiceModal({ mission, editable, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const defaultContent = buildMenageInvoiceContent(mission)
  const invoice = getMenageInvoice(mission.key, defaultContent)
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
    doc.save(`facture-menage-${mission.boat.replace(/\s+/g, '-')}-${mission.date}.pdf`)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Facture ménage</h2>
            <p className="text-navy-100 text-xs">{mission.boat} · {mission.date}</p>
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

        <div className="flex-1 overflow-auto p-5">
          {editable && !isPaid ? (
            <textarea
              className="w-full h-full min-h-[350px] text-xs border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed font-sans"
              value={invoice.content}
              onChange={e => updateMenageInvoiceContent(mission.key, e.target.value)}
            />
          ) : (
            <pre className="text-xs whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 leading-relaxed">{invoice.content}</pre>
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={downloadPdf}><Download size={14} /> Télécharger le PDF</button>
          {editable && !isPaid && (
            <button className="btn-primary flex-1 justify-center" onClick={() => markMenageInvoicePaid(mission.key)}>
              <CircleCheck size={14} /> Marquer comme réglée
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
