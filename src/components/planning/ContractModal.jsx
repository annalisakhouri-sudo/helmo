import { useState, useEffect } from 'react'
import { X, FileText, Download, Send, CircleCheck, RefreshCw, AlertTriangle } from 'lucide-react'
import { BOATS, CONTRACT_TEMPLATES } from '@/lib/mock-data'
import { buildContractContent, getDefaultTemplateId } from '@/lib/contract'
import { getContract, setContractTemplate, updateContractContent, sendContract, markContractSigned, subscribe } from '@/lib/shared-state'
import { fmtDate, fmtRange } from '@/lib/dates'

const TODAY = new Date('2026-07-04')

export default function ContractModal({ booking, onClose }) {
  const [, forceUpdate] = useState(0)
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  const boat = BOATS.find(b => b.id === booking.boatId)
  const defaultTemplateId = getDefaultTemplateId(boat)
  const defaultContent = buildContractContent(booking, defaultTemplateId)
  const contract = getContract(booking.id, defaultTemplateId, defaultContent)
  const isSent = contract.status === 'envoye'
  const isSigned = contract.status === 'signe'
  const daysSinceSent = isSent && contract.sentAt ? Math.floor((TODAY - new Date(contract.sentAt)) / (1000 * 60 * 60 * 24)) : 0
  const isOverdue = isSent && daysSinceSent >= 7

  function changeTemplate(templateId) {
    const content = buildContractContent(booking, templateId)
    setContractTemplate(booking.id, templateId, content)
  }

  function regenerate() {
    const content = buildContractContent(booking, contract.templateId)
    updateContractContent(booking.id, content)
  }

  // Génère un vrai PDF téléchargeable côté navigateur à partir du texte final du contrat.
  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 50
    const maxWidth = 495
    const lines = doc.splitTextToSize(contract.content, maxWidth)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    let y = margin
    lines.forEach(line => {
      if (y > 780) { doc.addPage(); y = margin }
      doc.text(line, margin, y)
      y += 14
    })
    doc.save(`contrat-${booking.client.replace(/\s+/g, '-')}-${booking.id}.pdf`)
  }

  function handleSend() {
    sendContract(booking.id)
    downloadPdf()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">Contrat de location</h2>
            <p className="text-navy-100 text-xs">{booking.boatName} — {booking.client}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          {isSigned ? (
            <div className="flex items-center gap-2">
              <CircleCheck size={16} className="text-teal-600" />
              <span className="text-xs font-medium text-teal-700">Signé reçu le {contract.signedAt} — dans les documents de la location</span>
            </div>
          ) : isSent ? (
            <div className="flex items-center gap-2">
              <CircleCheck size={16} className="text-navy-600" />
              <span className="text-xs font-medium text-navy-700">Envoyé au client le {fmtDate(contract.sentAt)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Brouillon — modifiable avant envoi</span>
            </div>
          )}
          {!isSent && !isSigned && (
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
              value={contract.templateId || defaultTemplateId}
              onChange={e => changeTemplate(e.target.value)}
            >
              {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
        </div>

        {isOverdue && (
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2.5 flex-shrink-0">
            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800"><strong>Envoyé il y a {daysSinceSent} jours</strong>, toujours pas de retour signé — pense à relancer le client.</p>
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          {isSent || isSigned ? (
            <pre className="text-xs whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 leading-relaxed">{contract.content}</pre>
          ) : (
            <textarea
              className="w-full h-full min-h-[400px] text-xs border border-gray-200 rounded-xl p-4 resize-none focus:outline-none focus:border-navy-600 leading-relaxed font-sans"
              value={contract.content}
              onChange={e => updateContractContent(booking.id, e.target.value)}
            />
          )}
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          {isSigned ? (
            <button className="btn-primary flex-1 justify-center" onClick={downloadPdf}>
              <Download size={14} /> Télécharger le PDF
            </button>
          ) : isSent ? (
            <>
              <button className="btn-ghost" onClick={downloadPdf}>
                <Download size={14} /> Télécharger le PDF
              </button>
              <button className="btn-primary flex-1 justify-center" onClick={() => markContractSigned(booking.id)}>
                <CircleCheck size={14} /> Marquer comme reçu signé
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={regenerate} title="Régénérer depuis les infos actuelles de la location">
                <RefreshCw size={14} /> Régénérer
              </button>
              <button className="btn-primary flex-1 justify-center" onClick={handleSend}>
                <Send size={14} /> Envoyer au client (génère le PDF)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
