// La facture "à l'écran" : même rendu pour la facture client, la facture ménage et l'aperçu
// de la trame dans Options → Facturation. Tout vient de la trame (tpl) + des données.
export default function InvoiceSheet({ tpl, invoiceNumber, date, from, to, subtitleLine, lineItems, total, editable, onAmountChange, notesNode }) {
  const accent = tpl.accent
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4" style={{ background: accent }}>
        <p className="font-display text-white text-lg font-bold">{tpl.title} N° {invoiceNumber}</p>
        <p className="text-white text-xs" style={{ opacity: 0.75 }}>Émise le {date}</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-5">
          {[{ label: tpl.fromLabel, party: from }, { label: tpl.toLabel, party: to }].map(({ label, party }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-900">{party.name}</p>
              {party.lines.filter(Boolean).map((l, i) => <p key={i} className="text-xs text-gray-500">{l}</p>)}
            </div>
          ))}
        </div>

        {tpl.showSubtitleLine && subtitleLine && (
          <p className="text-sm font-medium text-gray-700 mb-3">{subtitleLine}</p>
        )}

        <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: accent }}>
            <p className="text-[10px] font-bold text-white uppercase tracking-wide">{tpl.designationLabel}</p>
            <p className="text-[10px] font-bold text-white uppercase tracking-wide">{tpl.amountLabel}</p>
          </div>
          {lineItems.map((li, i) => (
            <div key={li.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
              <p className="text-sm text-gray-700 flex-1">{li.label}</p>
              {editable ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    className="w-20 text-sm text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy-600"
                    value={li.amount}
                    onChange={e => onAmountChange(li.id, Number(e.target.value) || 0)}
                  />
                  <span className="text-sm text-gray-500">€</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-800 flex-shrink-0">{li.amount} €</p>
              )}
            </div>
          ))}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: accent + '14', borderTop: `1px solid ${accent}33` }}>
            <p className="text-sm font-bold" style={{ color: accent }}>{tpl.totalLabel}</p>
            <p className="text-base font-bold" style={{ color: accent }}>{total} €</p>
          </div>
        </div>

        {notesNode}
        {tpl.paymentTerms && <p className="text-xs text-gray-600 mt-3 whitespace-pre-line">{tpl.paymentTerms}</p>}
        {tpl.legalMentions && <p className="text-xs text-gray-500 mt-3 whitespace-pre-line">{tpl.legalMentions}</p>}
        {tpl.footerNote && <p className="text-xs text-gray-400 mt-4 whitespace-pre-line">{tpl.footerNote}</p>}
      </div>
    </div>
  )
}
