import { useState } from 'react'
import React from 'react'
import { ChevronLeft, ChevronRight, X, Check, Send, LogOut } from 'lucide-react'
import { SkipperSidebar } from '@/components/layout/SkipperLayout'

const SKIPPER = { name: 'Jean-Marc Rossi', initials: 'JM', location: 'Marseille', rate: 180, rating: 4.9, missions: 38 }
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const ALL_MISSIONS = [
  { id:'m1', boat:'Dufour 360', agency:'Midi Nautisme', agencyColor:'#185FA5', start:'2026-07-05', end:'2026-07-12', days:7, amount:1260, status:'confirmed', client:'Moreau J.' },
  { id:'m2', boat:'Elba 45', agency:'Midi Nautisme', agencyColor:'#185FA5', start:'2026-07-19', end:'2026-07-26', days:7, amount:1260, status:'option', client:'Faure C.' },
  { id:'m3', boat:'Dufour 360', agency:'Midi Nautisme', agencyColor:'#185FA5', start:'2026-06-14', end:'2026-06-21', days:7, amount:1260, status:'done', paid:true, client:'Dupont M.' },
  { id:'m4', boat:'Dufour 412', agency:'Azur Loc Voile', agencyColor:'#0F6E56', start:'2026-06-21', end:'2026-06-28', days:7, amount:1260, status:'done', paid:true, client:'Martin P.' },
  { id:'m5', boat:'BSC 65', agency:'Locamotors', agencyColor:'#1D9E75', start:'2026-05-30', end:'2026-06-06', days:7, amount:1080, status:'done', paid:false, client:'Bernard L.' },
  { id:'m6', boat:'Dufour 390', agency:'Midi Nautisme', agencyColor:'#185FA5', start:'2026-04-12', end:'2026-04-15', days:3, amount:540, status:'done', paid:true, client:'Petit R.' },
]

const CONTACTS = [
  { name:'Midi Nautisme', contact:'Sophie Durand', phone:'04 91 54 86 09', email:'info@midinautisme.fr', missions:28, color:'#185FA5' },
  { name:'Locamotors', contact:'Marc Petit', phone:'04 91 54 86 10', email:'info@locamotors.fr', missions:5, color:'#1D9E75' },
  { name:'Azur Loc Voile', contact:'Julie Martin', phone:'06 12 34 56 78', email:'contact@azurloc.fr', missions:5, color:'#0F6E56' },
]

const STATUS_STYLE = {
  confirmed: { bg:'#E1F5EE', border:'#9FE1CB', text:'#085041', label:'Confirmée' },
  option:    { bg:'#FAEEDA', border:'#FAC775', text:'#633806', label:'Option' },
  done:      { bg:'#f3f4f6', border:'#e5e7eb', text:'#6b7280', label:'Terminée' },
}

// ── Planning mois ──────────────────────────────────────────────────
function PlanningMois({ onSelect }) {
  const [month, setMonth] = useState(6)
  const year = 2026
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay = (new Date(year, month, 1).getDay()+6)%7

  function fmt(d) { return d.toISOString().split('T')[0] }
  function getMissionsForDay(dayStr) {
    return ALL_MISSIONS.filter(m => dayStr >= m.start && dayStr <= m.end)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Planning</h1>
          <p className="text-xs text-gray-400">{MONTHS_FR[month]} {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost py-1.5 px-2" onClick={() => setMonth(m => Math.max(0,m-1))}><ChevronLeft size={14}/></button>
          <button className="btn-ghost py-1.5 px-2" onClick={() => setMonth(m => Math.min(11,m+1))}><ChevronRight size={14}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="flex gap-3 mb-3 flex-wrap">
          {[{c:'#E1F5EE',b:'#9FE1CB',l:'Confirmée'},{c:'#FAEEDA',b:'#FAC775',l:'Option'},{c:'#f3f4f6',b:'#e5e7eb',l:'Passée'}].map(({c,b,l})=>(
            <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400">
              <div style={{width:10,height:10,borderRadius:3,background:c,border:`1px solid ${b}`}}/>
              {l}
            </div>
          ))}
        </div>
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-navy-900">
            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
              <div key={d} className="py-2 text-center">
                <p className="text-[10px] text-navy-100 uppercase tracking-wide">{d}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array(firstDay).fill(null).map((_,i)=>(
              <div key={`b${i}`} className="min-h-20 bg-gray-50 border-r border-b border-gray-100"/>
            ))}
            {Array.from({length:daysInMonth},(_,i)=>{
              const dayStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
              const missions = getMissionsForDay(dayStr)
              const isToday = dayStr === new Date().toISOString().split('T')[0]
              return (
                <div key={i} className="min-h-20 border-r border-b border-gray-100 bg-white p-1">
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday?'bg-navy-600 text-white':'text-gray-500'}`}>
                    {i+1}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {missions.slice(0,2).map(m=>{
                      const s = STATUS_STYLE[m.status]||STATUS_STYLE.done
                      const isStart = dayStr === m.start
                      return (
                        <div key={m.id} onClick={()=>onSelect(m)}
                          className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate hover:opacity-80 transition-opacity"
                          style={{background:s.bg,color:s.text,border:`1px solid ${s.border}`}}
                        >
                          {isStart ? `▶ ${m.boat}` : `— ${m.agency.split(' ')[0]}`}
                        </div>
                      )
                    })}
                    {missions.length > 2 && <p className="text-[10px] text-gray-400 px-1">+{missions.length-2}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Détail mission ─────────────────────────────────────────────────
function MissionDetail({ mission, onClose }) {
  const [showSend, setShowSend] = useState(false)
  const [sent, setSent] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const fileRef = React.useRef()
  const [msg, setMsg] = useState(`Bonjour,\n\nVeuillez trouver ci-joint la facture pour la mission ${mission.boat} du ${mission.start} au ${mission.end}.\n\nMontant : ${mission.amount}€\n\nCordialement,\n${SKIPPER.name}`)
  const s = STATUS_STYLE[mission.status]||STATUS_STYLE.done

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{mission.boat}</h2>
            <p className="text-navy-100 text-xs">{mission.agency} · {mission.start} → {mission.end}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['Client',mission.client],['Durée',`${mission.days} jours`],['Montant',`${mission.amount}€`],['Statut',s.label]].map(([l,v])=>(
              <div key={l} className="card-sm">
                <p className="text-[10px] text-gray-400 mb-1">{l}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
          {!sent ? (
            !showSend ? (
              <button onClick={()=>setShowSend(true)} className="btn-primary w-full justify-center">
                <Send size={14}/> Envoyer la facture via messagerie
              </button>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-2">Message à {mission.agency}</p>
                <textarea className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600" rows={7} value={msg} onChange={e=>setMsg(e.target.value)}/>
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                <button onClick={()=>fileRef.current?.click()} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
                  📎 {attachment ? attachment.name : 'Joindre un fichier'}
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={e=>setAttachment(e.target.files[0])}/>
              </div>
              <div className="flex gap-2">
              <button className="btn-ghost flex-1 justify-center" onClick={()=>setShowSend(false)}>Annuler</button>
                  </div>
              <button className="btn-primary flex-1 justify-center" onClick={()=>{setSent(true);setShowSend(false)}}>
                    <Send size={13}/> Envoyer
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl p-3">
              <Check size={16} className="text-teal-600"/><p className="text-sm text-teal-700 font-medium">Facture envoyée via messagerie !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Revenus ────────────────────────────────────────────────────────
function Revenus({ onSelect }) {
  const [selMonth, setSelMonth] = useState(5)
  const year = 2026
  const done = ALL_MISSIONS.filter(m=>m.status==='done')
  const totalYear = done.reduce((a,m)=>a+m.amount,0)
  const totalPaid = done.filter(m=>m.paid).reduce((a,m)=>a+m.amount,0)
  const monthly = MONTHS_SHORT.map((_,i)=>done.filter(m=>new Date(m.start).getMonth()===i).reduce((a,m)=>a+m.amount,0))
  const maxM = Math.max(...monthly,1)
  const monthMissions = done.filter(m=>new Date(m.start).getMonth()===selMonth)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar"><h1 className="font-display text-base font-bold">Revenus</h1></div>
      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{l:'Total 2026',v:`${totalYear}€`,c:'#185FA5'},{l:'Reçu',v:`${totalPaid}€`,c:'#0F6E56'},{l:'En attente',v:`${totalYear-totalPaid}€`,c:'#A32D2D'}].map(({l,v,c})=>(
            <div key={l} className="card text-center">
              <p className="font-display text-2xl font-bold" style={{color:c}}>{v}</p>
              <p className="text-xs text-gray-400 mt-1">{l}</p>
            </div>
          ))}
        </div>
        <div className="card mb-4">
          <p className="text-sm font-medium mb-3">Revenus mensuels {year}</p>
          <div className="flex items-end gap-1" style={{height:80}}>
            {monthly.map((v,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-1 cursor-pointer" onClick={()=>setSelMonth(i)}>
                <div style={{width:'100%',borderRadius:3,height:v>0?`${Math.max(6,(v/maxM)*68)}px`:'4px',background:i===selMonth?'#185FA5':v>0?'#B5D4F4':'#f3f4f6',transition:'all 0.2s'}}/>
                <p style={{fontSize:8,color:i===selMonth?'#185FA5':'#9ca3af',fontWeight:i===selMonth?600:400}}>{MONTHS_SHORT[i]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">{MONTHS_SHORT[selMonth]} {year}</p>
            <p className="font-display text-lg font-bold text-navy-600">{monthly[selMonth]}€</p>
          </div>
          {monthMissions.length===0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Aucune prestation ce mois</p>
          ) : monthMissions.map(m=>(
            <div key={m.id} onClick={()=>onSelect(m)} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded transition-colors">
              <div>
                <p className="text-sm font-medium">{m.boat}</p>
                <p className="text-xs text-gray-400">{m.agency} · {m.days}j · {m.client}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{color:m.paid?'#0F6E56':'#A32D2D'}}>{m.amount}€</p>
                <span className={m.paid?'pill-ok':'pill-warn'} style={{fontSize:9}}>{m.paid?'Payée':'Attente'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Disponibilités ─────────────────────────────────────────────────
function Dispos() {
  const [month, setMonth] = useState(6)
  const year = 2026
  const [states, setStates] = useState({
    '2026-07-05':'busy','2026-07-06':'busy','2026-07-07':'busy','2026-07-08':'busy',
    '2026-07-09':'busy','2026-07-10':'busy','2026-07-11':'busy','2026-07-12':'busy',
  })
  const daysInMonth = new Date(year,month+1,0).getDate()
  const firstDay = (new Date(year,month,1).getDay()+6)%7
  function toggle(date) {
    setStates(prev=>{const cur=prev[date]||'';const next=cur===''?'option':cur==='option'?'busy':'';const r={...prev};if(next==='')delete r[date];else r[date]=next;return r})
  }
  const S = {'':{bg:'#E1F5EE',color:'#085041'},'option':{bg:'#FAEEDA',color:'#633806'},'busy':{bg:'#FCEBEB',color:'#791F1F'}}

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div><h1 className="font-display text-base font-bold">Disponibilités</h1><p className="text-xs text-gray-400">{MONTHS_FR[month]} {year}</p></div>
        <div className="flex gap-2">
          <button className="btn-ghost py-1.5 px-2" onClick={()=>setMonth(m=>Math.max(0,m-1))}><ChevronLeft size={14}/></button>
          <button className="btn-ghost py-1.5 px-2" onClick={()=>setMonth(m=>Math.min(11,m+1))}><ChevronRight size={14}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="card">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L','M','M','J','V','S','D'].map(d=><div key={d} className="text-[10px] text-center text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_,i)=><div key={`b${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>{
              const d=`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
              const st=states[d]||''
              const s=S[st]
              return <div key={i} onClick={()=>toggle(d)} style={{fontSize:11,textAlign:'center',padding:'7px 2px',borderRadius:6,cursor:'pointer',background:s.bg,color:s.color,fontWeight:500,transition:'all 0.1s'}}>{i+1}</div>
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {[{bg:'#E1F5EE',c:'#085041',l:'Dispo'},{bg:'#FAEEDA',c:'#633806',l:'Option'},{bg:'#FCEBEB',c:'#791F1F',l:'Indispo'}].map(({bg,c,l})=>(
              <div key={l} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:3,background:bg}}/><span className="text-xs text-gray-400">{l}</span></div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">Cliquez sur un jour pour changer son état</p>
        </div>
      </div>
    </div>
  )
}

// ── Messagerie simple ──────────────────────────────────────────────
function MessagerieSkipper() {
  const [active, setActive] = useState(0)
  const [input, setInput] = useState('')
  const [convs, setConvs] = useState([
    { name:'Midi Nautisme', initials:'MN', msgs:[
      {from:'agency',text:'Bonjour Jean-Marc, disponible le 5 juillet ?',time:'09:15'},
      {from:'skipper',text:'Oui, je confirme. Je serai au quai à 8h30.',time:'09:41'},
    ]},
    { name:'Azur Loc Voile', initials:'AL', msgs:[
      {from:'agency',text:'Avez-vous de la dispo mi-juillet ?',time:'Hier'},
    ]},
  ])

  function send() {
    if(!input.trim()) return
    const time = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
    setConvs(prev=>prev.map((c,i)=>i===active?{...c,msgs:[...c.msgs,{from:'skipper',text:input.trim(),time}]}:c))
    setInput('')
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-44 border-r border-gray-100 flex flex-col bg-gray-50 flex-shrink-0">
        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 px-3 py-3">Conversations</p>
        {convs.map((c,i)=>(
          <div key={i} onClick={()=>setActive(i)} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer border-b border-gray-100 ${active===i?'bg-navy-50 border-l-2 border-l-navy-600':''}`}>
            <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center text-navy-800 text-xs font-medium flex-shrink-0">{c.initials}</div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{c.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{c.msgs[c.msgs.length-1]?.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-medium">{convs[active]?.name}</p>
        </div>
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          {convs[active]?.msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.from==='skipper'?'justify-end':'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-3 py-2 ${m.from==='skipper'?'bg-navy-600 text-white rounded-tr-sm':'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                <p className="text-sm">{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.from==='skipper'?'text-navy-200':'text-gray-400'}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <input className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-navy-600" placeholder="Message..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/>
          <button onClick={send} className={`w-9 h-9 rounded-xl flex items-center justify-center ${input.trim()?'bg-navy-600 text-white':'bg-gray-100 text-gray-300'}`} disabled={!input.trim()}>→</button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ────────────────────────────────────────────
export default function SkipperDashboard({ onLogout }) {
  const [tab, setTab] = useState('planning')
  const [selectedMission, setSelectedMission] = useState(null)
  const future = ALL_MISSIONS.filter(m=>m.status==='confirmed'||m.status==='option')
  const past = ALL_MISSIONS.filter(m=>m.status==='done')
  const [mView, setMView] = useState('future')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SkipperSidebar skipper={SKIPPER} onLogout={onLogout} activeTab={tab} setTab={setTab}/>
      <main className="flex-1 flex flex-col overflow-hidden">

        {tab==='planning' && <PlanningMois onSelect={setSelectedMission}/>}

        {tab==='missions' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="topbar">
              <h1 className="font-display text-base font-bold">Missions</h1>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {[{id:'future',l:'À venir'},{id:'past',l:'Passées'}].map(v=>(
                  <button key={v.id} onClick={()=>setMView(v.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mView===v.id?'bg-white text-navy-600':'text-gray-500'}`}>{v.l}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
              {(mView==='future'?future:past).map(m=>{
                const s=STATUS_STYLE[m.status]||STATUS_STYLE.done
                return (
                  <div key={m.id} onClick={()=>setSelectedMission(m)} className="card cursor-pointer hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div><p className="font-medium text-sm mb-0.5">{m.boat}</p><p className="text-xs text-gray-400">{m.agency} · {m.client}</p></div>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{background:s.bg,color:s.text}}>{s.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">{m.start} → {m.end} · {m.days}j</p>
                      <p className="text-sm font-bold" style={{color:m.status==='done'?(m.paid?'#0F6E56':'#A32D2D'):'#185FA5'}}>{m.amount}€</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab==='revenus' && <Revenus onSelect={setSelectedMission}/>}

        {tab==='contacts' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="topbar"><h1 className="font-display text-base font-bold">Contacts agences</h1></div>
            <div className="flex-1 overflow-auto p-5 flex flex-col gap-3">
              {CONTACTS.map(a=>(
                <div key={a.name} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{background:a.color}}>{a.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                      <div><p className="text-sm font-medium">{a.name}</p><p className="text-xs text-gray-400">{a.contact}</p></div>
                    </div>
                    <span className="pill-blue text-[10px]">{a.missions} missions</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <a href={`tel:${a.phone}`} className="text-xs text-navy-600">📞 {a.phone}</a>
                    <a href={`mailto:${a.email}`} className="text-xs text-navy-600">✉ {a.email}</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='dispos' && <Dispos/>}
        {tab==='messagerie' && <MessagerieSkipper/>}
      </main>

      {selectedMission && <MissionDetail mission={selectedMission} onClose={()=>setSelectedMission(null)}/>}
    </div>
  )
}
