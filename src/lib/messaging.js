// Messagerie agence ↔ skippers : UN seul fil par skipper, lu par les deux côtés.
// L'agence écrit depuis « Messagerie », le skipper depuis son espace : chacun voit les
// messages de l'autre (dans le même navigateur pour la démo ; en production : Supabase realtime).
import { SKIPPERS } from './mock-data'

const nowTime = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

let threads = {
  'skip-1': [
    { id: 'm1', from: 'agency', text: 'Bonjour Jean-Marc, êtes-vous disponible le 5 juillet pour le Dufour 360 ?', time: '09:15', date: '3 juillet' },
    { id: 'm2', from: 'skipper', text: "Bonjour ! Oui je suis disponible ce jour-là. C'est pour combien de jours ?", time: '09:32', date: '3 juillet' },
    { id: 'm3', from: 'agency', text: 'Une semaine, du 5 au 12 juillet. Tarif habituel 180€/j.', time: '09:35', date: '3 juillet' },
    { id: 'm4', from: 'skipper', text: 'Parfait, je confirme. Je serai au quai à 8h30 le samedi 5.', time: '09:41', date: "Aujourd'hui" },
  ],
  'skip-2': [
    { id: 'm5', from: 'agency', text: "Sophie, avez-vous de la dispo pour l'Elba 45 semaine du 5 juillet ?", time: '10:00', date: "Aujourd'hui" },
    { id: 'm6', from: 'skipper', text: 'Oui bien sûr ! Vous avez besoin de moi pour toute la semaine ?', time: '10:15', date: "Aujourd'hui" },
  ],
  'skip-3': [
    { id: 'm7', from: 'agency', text: 'Thomas, avez-vous de la dispo mi-juillet ?', time: '14:20', date: '2 juillet' },
  ],
}

// Messages non lus, par côté : { agency: { skipperId: n }, skipper: { skipperId: n } }
let unread = { agency: { 'skip-2': 1 }, skipper: {} }
let listeners = []
const notify = () => listeners.forEach(fn => fn())

export function subscribeMessages(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}

export function getThread(skipperId) {
  return threads[skipperId] || []
}

export function getThreadSkipperIds() {
  return SKIPPERS.map(s => s.id).filter(id => threads[id])
}

// from : 'agency' | 'skipper' | 'system' (demande de mission, réponse…)
export function sendMessage(skipperId, from, text, extra = {}) {
  if (!text.trim()) return
  const msg = { id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, from, text: text.trim(), time: nowTime(), date: "Aujourd'hui", ...extra }
  threads = { ...threads, [skipperId]: [...(threads[skipperId] || []), msg] }
  // Le destinataire a un message non lu.
  if (from === 'agency') unread.skipper[skipperId] = (unread.skipper[skipperId] || 0) + 1
  if (from === 'skipper') unread.agency[skipperId] = (unread.agency[skipperId] || 0) + 1
  notify()
}

export function getUnread(side, skipperId) {
  return unread[side][skipperId] || 0
}

export function getTotalUnread(side) {
  return Object.values(unread[side]).reduce((n, v) => n + v, 0)
}

export function markRead(side, skipperId) {
  if (!unread[side][skipperId]) return
  unread = { ...unread, [side]: { ...unread[side], [skipperId]: 0 } }
  notify()
}

export function markUnread(side, skipperId) {
  unread = { ...unread, [side]: { ...unread[side], [skipperId]: Math.max(1, unread[side][skipperId] || 0) } }
  notify()
}
