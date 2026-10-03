import { hexToRgb } from './invoice-templates'

// Génère le PDF d'une facture à partir de la trame (couleur, titre, libellés, mentions…).
// Un seul générateur pour tous les types de facture : trame modifiée = PDF modifié.
export async function buildInvoicePdf({ tpl, invoiceNumber, date, from, to, subtitleLine, lineItems, total, notes }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const L = 50, R = 545, BOTTOM = 790, COL2 = 330
  const accent = hexToRgb(tpl.accent)
  let y

  doc.setFillColor(...accent)
  doc.rect(0, 0, 595, 90, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(`${tpl.title} N° ${invoiceNumber}`, L, 45)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`Émise le ${date}`, L, 65)

  y = 125
  doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text(tpl.fromLabel.toUpperCase(), L, y)
  doc.text(tpl.toLabel.toUpperCase(), COL2, y)
  y += 14
  doc.setTextColor(30, 30, 30); doc.setFontSize(11)
  doc.text(from.name, L, y)
  doc.text(to.name, COL2, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  const rows = Math.max(from.lines.length, to.lines.length)
  for (let i = 0; i < rows; i++) {
    y += 13
    if (from.lines[i]) doc.text(from.lines[i], L, y)
    if (to.lines[i]) doc.text(to.lines[i], COL2, y)
  }

  if (tpl.showSubtitleLine && subtitleLine) {
    y += 28
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    doc.text(subtitleLine, L, y)
  }

  y += 28
  doc.setFillColor(...accent)
  doc.rect(L, y - 13, R - L, 22, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text(tpl.designationLabel.toUpperCase(), L + 8, y + 2)
  doc.text(tpl.amountLabel.toUpperCase(), R - 8, y + 2, { align: 'right' })

  y += 22
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  lineItems.forEach((li, i) => {
    if (y > BOTTOM - 140) { doc.addPage(); y = 60 }
    if (i % 2 === 0) { doc.setFillColor(245, 246, 248); doc.rect(L, y - 13, R - L, 22, 'F') }
    doc.setTextColor(30, 30, 30)
    doc.text(li.label, L + 8, y + 2)
    doc.text(`${li.amount} €`, R - 8, y + 2, { align: 'right' })
    y += 22
  })

  y += 8
  const tint = accent.map(v => Math.round(v + (255 - v) * 0.9))
  doc.setFillColor(...tint)
  doc.rect(L, y - 13, R - L, 28, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...accent)
  doc.text(tpl.totalLabel, L + 8, y + 5)
  doc.text(`${total} €`, R - 8, y + 5, { align: 'right' })

  y += 45
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70)
  ;[notes, tpl.paymentTerms, tpl.legalMentions].filter(Boolean).forEach(text => {
    const lines = doc.splitTextToSize(text, R - L)
    if (y + lines.length * 12 > BOTTOM - 30) { doc.addPage(); y = 60 }
    doc.text(lines, L, y)
    y += lines.length * 12 + 10
  })

  if (tpl.footerNote) {
    const lines = doc.splitTextToSize(tpl.footerNote, R - L)
    if (y + lines.length * 12 > BOTTOM) { doc.addPage(); y = 60 }
    doc.setTextColor(130, 130, 130)
    doc.text(lines, L, y + 6)
  }
  return doc
}

export async function downloadInvoicePdf(params, filename) {
  const doc = await buildInvoicePdf(params)
  doc.save(filename)
}
