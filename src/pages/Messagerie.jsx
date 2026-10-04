import { useState, useRef, useEffect } from 'react'
import { Send, Search, X, MoreVertical, Archive, CheckCheck, RotateCcw, ArchiveRestore } from 'lucide-react'
import { SKIPPERS } from '@/lib/mock-data'
import { getThread, getThreadSkipperIds, sendMessage as storeSend, subscribeMessages, getUnread, markRead, markUnread } from '@/lib/messaging'


// Les messages viennent de la messagerie partagée (src/lib/messaging.js) : le skipper les voit
// dans son espace, et ses réponses (ou son acceptation d'une mission) arrivent ici.
// Ici on ne garde que l'état d'affichage : conversation clôturée / archivée.
const convFor = skipper => ({ id: 'conv-' + skipper.id, skipper, closed: false, archived: false })

export default function Messagerie({ initialSkipper, onClose }) {
  const [convFlags, setConvFlags] = useState({}) // convId -> { closed, archived }
  const [, refresh] = useState(0)
  useEffect(() => subscribeMessages(() => refresh(v => v + 1)), [])

  const threadIds = getThreadSkipperIds()
  const skipperList = [
    ...SKIPPERS.filter(sk => threadIds.includes(sk.id)),
    ...(initialSkipper && !threadIds.includes(initialSkipper.id) ? [initialSkipper] : []),
  ]
  const convs = skipperList.map(sk => {
    const messages = getThread(sk.id)
    const last = messages[messages.length - 1]
    return {
      ...convFor(sk),
      ...convFlags['conv-' + sk.id],
      messages,
      lastMsg: last ? last.text : 'Nouvelle conversation',
      lastTime: last ? last.time : 'Maintenant',
      unread: getUnread('agency', sk.id),
      // Relance proposée si notre dernier message date d'avant aujourd'hui sans réponse.
      daysSinceLastReply: last && last.from === 'agency' && last.date !== "Aujourd'hui" ? 2 : 0,
    }
  })
  const setFlag = (id, patch) => setConvFlags(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const [activeId, setActiveId] = useState(() => 'conv-' + (initialSkipper?.id || threadIds[0]))
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const bottomRef = useRef(null)

  const active = convs.find(c => c.id === activeId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeId, active?.messages.length])

  // Conversation ouverte = messages lus.
  useEffect(() => {
    if (active && active.unread > 0) markRead('agency', active.skipper.id)
  }, [activeId, active?.unread])

  function sendMessage() {
    if (!input.trim() || !active) return
    storeSend(active.skipper.id, 'agency', input)
    setInput('')
  }

  function toggleUnread() {
    if (!active) return
    if (active.unread > 0) markRead('agency', active.skipper.id)
    else markUnread('agency', active.skipper.id)
  }

  function toggleClosed() {
    setFlag(activeId, { closed: !active?.closed })
    setShowMenu(false)
  }

  function toggleArchived() {
    setFlag(activeId, { archived: !active?.archived })
    setShowMenu(false)
    setActiveId(null)
  }

  function relancer() {
    if (!active) return
    storeSend(active.skipper.id, 'agency', `Bonjour ${active.skipper.name.split(' ')[0]}, je me permets de relancer ma demande précédente, avez-vous pu y réfléchir ?`)
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
              onClick={() => { setActiveId(conv.id); markRead('agency', conv.skipper.id) }}
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
                      <p className="text-sm leading-relaxed whitespace-pre-line">{item.text}</p>
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
