import { useState, useRef, useEffect } from 'react'
import { Send, Search, X, MoreVertical, Archive, CheckCheck, RotateCcw, ArchiveRestore } from 'lucide-react'
import { SKIPPERS } from '@/lib/mock-data'

const TODAY_LABEL = "Aujourd'hui"

const INITIAL_CONVERSATIONS = [
  {
    id: 'conv-1',
    skipper: SKIPPERS[0],
    closed: false,
    archived: false,
    messages: [
      { id: 'm1', from: 'agency', text: 'Bonjour Jean-Marc, êtes-vous disponible le 5 juillet pour le Dufour 360 ?', time: '09:15', date: '4 juillet' },
      { id: 'm2', from: 'skipper', text: 'Bonjour ! Oui je suis disponible ce jour-là. C\'est pour combien de jours ?', time: '09:32', date: '4 juillet' },
      { id: 'm3', from: 'agency', text: 'Une semaine, du 5 au 12 juillet. Tarif habituel 180€/j.', time: '09:35', date: '4 juillet' },
      { id: 'm4', from: 'skipper', text: 'Parfait, je confirme. Je serai au quai à 8h30 le samedi 5.', time: '09:41', date: "Aujourd'hui" },
    ],
    lastMsg: 'Parfait, je confirme.',
    lastTime: '09:41',
    unread: 0,
  },
  {
    id: 'conv-2',
    skipper: SKIPPERS[1],
    closed: false,
    archived: false,
    messages: [
      { id: 'm5', from: 'agency', text: 'Sophie, avez-vous de la dispo pour l\'Elba 45 semaine du 5 juillet ?', time: '10:00', date: "Aujourd'hui" },
      { id: 'm6', from: 'skipper', text: 'Oui bien sûr ! Vous avez besoin de moi pour toute la semaine ?', time: '10:15', date: "Aujourd'hui" },
    ],
    lastMsg: 'Oui bien sûr !',
    lastTime: '10:15',
    unread: 1,
  },
  {
    id: 'conv-3',
    skipper: SKIPPERS[2],
    closed: false,
    archived: false,
    messages: [
      { id: 'm7', from: 'agency', text: 'Thomas, avez-vous de la dispo mi-juillet ?', time: '14:20', date: '2 jours' },
    ],
    lastMsg: 'Thomas, avez-vous de la dispo...',
    lastTime: '2j',
    unread: 0,
    daysSinceLastReply: 2,
  },
]

export default function Messagerie({ initialSkipper, onClose }) {
  const [convs, setConvs] = useState(() => {
    if (initialSkipper) {
      const exists = INITIAL_CONVERSATIONS.find(c => c.skipper.id === initialSkipper.id)
      if (!exists) {
        return [...INITIAL_CONVERSATIONS, {
          id: 'conv-new-' + Date.now(),
          skipper: initialSkipper,
          closed: false, archived: false,
          messages: [],
          lastMsg: 'Nouvelle conversation',
          lastTime: 'Maintenant',
          unread: 0,
        }]
      }
    }
    return INITIAL_CONVERSATIONS
  })
  const [activeId, setActiveId] = useState(() => {
    if (initialSkipper) {
      const exists = INITIAL_CONVERSATIONS.find(c => c.skipper.id === initialSkipper.id)
      return exists ? exists.id : 'conv-new-' + Date.now()
    }
    return 'conv-1'
  })
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const bottomRef = useRef(null)

  const active = convs.find(c => c.id === activeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, convs])

  function sendMessage() {
    if (!input.trim() || !active) return
    const msg = { id: 'm-' + Date.now(), from: 'agency', text: input.trim(), time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), date: TODAY_LABEL }
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, msg], lastMsg: input.trim(), lastTime: msg.time, daysSinceLastReply: 0 } : c))
    setInput('')
  }

  function toggleUnread() {
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, unread: c.unread > 0 ? 0 : 1 } : c))
  }

  function toggleClosed() {
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, closed: !c.closed } : c))
    setShowMenu(false)
  }

  function toggleArchived() {
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, archived: !c.archived } : c))
    setShowMenu(false)
    setActiveId(null)
  }

  function relancer() {
    if (!active) return
    const relance = { id: 'm-' + Date.now(), from: 'agency', text: `Bonjour ${active.skipper.name.split(' ')[0]}, je me permets de relancer ma demande précédente, avez-vous pu y réfléchir ?`, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), date: TODAY_LABEL }
    setConvs(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, relance], lastMsg: relance.text, lastTime: relance.time, daysSinceLastReply: 0 } : c))
  }

  // Recherche sur le nom du contact ET le contenu des messages
  const filtered = convs.filter(c => {
    if (c.archived !== showArchived) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    const nameMatch = c.skipper.name.toLowerCase().includes(s)
    const msgMatch = c.messages.some(m => m.text.toLowerCase().includes(s))
    return nameMatch || msgMatch
  })

  const isModal = !!onClose

  // Regrouper les messages de la conversation active par date
  function groupByDate(messages) {
    const groups = []
    let lastDate = null
    messages.forEach(m => {
      if (m.date !== lastDate) {
        groups.push({ type: 'date', date: m.date, id: 'd-' + m.id })
        lastDate = m.date
      }
      groups.push({ type: 'msg', ...m })
    })
    return groups
  }

  const content = (
    <div className={`flex ${isModal ? 'h-[560px]' : 'h-full'} overflow-hidden`}>
      {/* Liste conversations */}
      <div className="w-60 border-r border-gray-100 flex flex-col flex-shrink-0 bg-gray-50">
        <div className="p-3 border-b border-gray-100">
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Contact ou message..."
              className="w-full text-xs pl-7 pr-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-navy-600"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-white rounded-lg p-0.5 border border-gray-200">
            <button onClick={() => setShowArchived(false)} className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-colors ${!showArchived ? 'bg-navy-600 text-white' : 'text-gray-500'}`}>Actives</button>
            <button onClick={() => setShowArchived(true)} className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-colors ${showArchived ? 'bg-navy-600 text-white' : 'text-gray-500'}`}>Archivées</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6 px-3">{showArchived ? 'Aucune conversation archivée.' : 'Aucun résultat.'}</p>
          )}
          {filtered.map(conv => (
            <div
              key={conv.id}
              className={`flex items-center gap-2.5 px-3 py-3 cursor-pointer border-b border-gray-100 transition-colors ${activeId === conv.id ? 'bg-navy-50 border-l-2 border-l-navy-600' : 'hover:bg-white'}`}
              onClick={() => { setActiveId(conv.id); setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c)) }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${conv.skipper.color}`}>
                {conv.skipper.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium truncate flex items-center gap-1">
                    {conv.skipper.name.split(' ')[0]}
                    {conv.closed && <span className="text-[9px] text-gray-400">· clôturée</span>}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{conv.lastTime}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{conv.lastMsg}</p>
              </div>
              {conv.unread > 0 && (
                <div className="w-4 h-4 rounded-full bg-navy-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] text-white font-medium">{conv.unread}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zone de conversation */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {active ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${active.skipper.color}`}>
                {active.skipper.initials}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{active.skipper.name}</p>
                <p className="text-xs text-gray-400">{active.skipper.location} · {active.skipper.rate}€/j</p>
              </div>
              <div className="flex items-center gap-2 relative">
                {active.closed && <span className="pill-blue text-[10px]">Clôturée</span>}
                {active.archived && <span className="text-[10px] text-gray-400">Archivée</span>}
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setShowMenu(s => !s)}>
                  <MoreVertical size={14} />
                </button>
                {showMenu && (
                  <div className="absolute top-9 right-0 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 w-48 z-10">
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" onClick={toggleUnread}>
                      <RotateCcw size={12} /> Marquer non lu
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" onClick={toggleClosed}>
                      <CheckCheck size={12} /> {active.closed ? 'Réouvrir' : 'Clôturer la discussion'}
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2" onClick={toggleArchived}>
                      {active.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                      {active.archived ? 'Désarchiver' : 'Archiver'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Suggestion de relance */}
            {active.daysSinceLastReply >= 2 && !active.closed && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-amber-700">Pas de réponse depuis {active.daysSinceLastReply} jours</p>
                <button className="text-xs font-medium text-amber-800 hover:underline" onClick={relancer}>Relancer →</button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
              {active.messages.length === 0 && (
                <div className="text-center text-sm text-gray-400 mt-8">
                  Démarrez la conversation avec {active.skipper.name.split(' ')[0]}
                </div>
              )}
              {groupByDate(active.messages).map(item => (
                item.type === 'date' ? (
                  <div key={item.id} className="flex justify-center my-2">
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{item.date}</span>
                  </div>
                ) : (
                  <div key={item.id} className={`flex ${item.from === 'agency' ? 'justify-end' : 'justify-start'}`}>
                    {item.from === 'skipper' && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium mr-2 flex-shrink-0 mt-1 ${active.skipper.color}`}>
                        {active.skipper.initials}
                      </div>
                    )}
                    <div className={`max-w-xs rounded-2xl px-3 py-2 ${item.from === 'agency' ? 'bg-navy-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      <p className="text-sm leading-relaxed">{item.text}</p>
                      <p className={`text-[10px] mt-1 ${item.from === 'agency' ? 'text-navy-200' : 'text-gray-400'}`}>{item.time}</p>
                    </div>
                  </div>
                )
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!active.closed ? (
              <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder={`Message à ${active.skipper.name.split(' ')[0]}...`}
                  className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-navy-600"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${input.trim() ? 'bg-navy-600 text-white hover:bg-navy-800' : 'bg-gray-100 text-gray-300'}`}
                  onClick={sendMessage}
                  disabled={!input.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 text-center">
                <p className="text-xs text-gray-400">Discussion clôturée — <button className="text-navy-600 hover:underline" onClick={toggleClosed}>réouvrir</button></p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  )

  if (isModal) return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Messagerie</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        {content}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar flex-shrink-0">
        <div>
          <h1 className="font-display text-base font-bold">Messagerie</h1>
          <p className="text-xs text-gray-400">{convs.filter(c => !c.archived).length} conversations</p>
        </div>
      </div>
      {content}
    </div>
  )
}
