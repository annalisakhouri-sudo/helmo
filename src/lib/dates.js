// Dates lisibles partout dans l'app : « 18 juil. » plutôt que « 2026-07-18 ».
export function fmtDate(d, withYear = false) {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date)) return d
  return date.toLocaleDateString('fr-FR', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' })
}

export function fmtRange(start, end) {
  if (!start) return ''
  if (!end || start === end) return fmtDate(start)
  return `${fmtDate(start)} → ${fmtDate(end)}`
}
