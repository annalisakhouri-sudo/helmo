import { useState, useEffect } from 'react'
import { Check, AlertTriangle, Sparkles, Clock, ChevronRight, ChevronLeft, X, Anchor, Users, LogOut, Phone, FileText, ClipboardCheck, CircleCheck, PenLine, Calendar, AlertOctagon } from 'lucide-react'
import { BOATS, CLIENTS, SKIPPERS, BOOKINGS, DOC_LABELS, TECHNICIANS, OPTIONS_CATALOG } from '@/lib/mock-data'
import { TechSidebar } from '@/components/layout/SkipperLayout'
import { getState, toggleTask, subscribe, completeCheckIn, getCheckInProgress, toggleCheckInItem, setCheckInItemsBulk, setCheckInMissing, setCheckInRemarks, setMissionNote, addMissionRequest } from '@/lib/shared-state'
import { getMissionsForTech, getMissionTasks, getMenageStatus } from '@/lib/tech-missions'
import CheckOutModal from '@/components/planning/CheckOutModal'
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// ── Techniciens et leurs missions : même source que la page agence (src/lib/tech-missions.js) ──
// Une réassignation faite côté agence apparaît immédiatement ici, et inversement.
const TECH_META = TECHNICIANS.map(t => ({ id: t.id, name: t.name, initials: t.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), color: '#185FA5', base: t.base }))

function getTechMissions(techId) {
  const tech = TECHNICIANS.find(t => t.id === techId)
  return getMissionsForTech(techId).map(m => {
    if (tech) getMissionTasks(tech, m) // crée la check-list si elle n'existe pas encore
    return { ...m, boatName: m.boat }
  })
}

// Tous les techniciens d'un coup (vue équipe) : leurs check-lists doivent exister aussi.
TECHNICIANS.forEach(t => getTechMissions(t.id))

// Encart « ménage » : le technicien voit si la société de ménage est passée.
function MenageStatusCard({ mission }) {
  const st = getMenageStatus(mission)
  if (!st) return null
  const hour = st.meta ? (() => { const d = new Date(st.meta.at); return `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` })() : null
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl mb-4" style={{ background: st.done ? '#E1F5EE' : '#F3F4F6', border: `1px solid ${st.done ? '#9FE1CB' : '#E5E7EB'}` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: st.done ? '#1D9E75' : '#fff' }}>
        {st.done ? <Check size={15} color="#fff" strokeWidth={3} /> : <Clock size={15} className="text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: st.done ? '#085041' : '#374151' }}>{st.done ? 'Ménage fait' : 'Ménage pas encore fait'}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1"><Sparkles size={11} /> {st.providerName}{st.done && hour ? ` · ${st.meta.type === 'agency' ? "confirmé par l'agence" : 'coché'} à ${hour}` : ' · nettoyage géré par la société'}</p>
      </div>
    </div>
  )
}

const CHECKLIST_ITEMS = [
  { category:'Sécurité', items:[{id:'c1',label:'Gilets de sauvetage (x6)'},{id:'c2',label:'Fusées de détresse'},{id:'c3',label:'Extincteur'},{id:'c4',label:'Balise EPIRB'},{id:'c5',label:'Trousse premiers secours'}]},
  { category:'Cuisine', items:[{id:'c6',label:'Assiettes & couverts'},{id:'c7',label:'Verres & tasses'},{id:'c8',label:'Casseroles & poêles'},{id:'c9',label:'Ouvre-boîte & tire-bouchon'}]},
  { category:'Cabines', items:[{id:'c10',label:'Oreillers'},{id:'c11',label:'Couvertures'},{id:'c12',label:'Papier toilette & produits'}]},
  { category:'Nautique', items:[{id:'c13',label:'Jerricane carburant (plein)'},{id:'c14',label:'Fenders & aussières'},{id:'c15',label:'Annexe & pagaies'}]},
]

// ── Modal Fiche Bateau ────────────────────────────────────────────
function BoatModal({ boatId, onClose }) {
  const boat = BOATS.find(b => b.id === boatId)
  if(!boat) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div><h2 className="font-display text-white text-base font-bold">{boat.name}</h2><p className="text-navy-100 text-xs">{boat.type} · {boat.length}m · {boat.annee} · {boat.port}</p></div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <p className="section-label">Informations</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['Modèle',boat.modele],['Longueur',`${boat.length}m`],['Année',boat.annee],['Capacité',`${boat.capacite} pers.`],['Cabines',boat.cabines||'—'],['Immat.',boat.immat]].map(([l,v])=>(
              <div key={l} className="card-sm"><p className="text-[10px] text-gray-400 mb-1">{l}</p><p className="text-xs font-medium truncate">{v}</p></div>
            ))}
          </div>
          <p className="section-label">Documents</p>
          <div className="card py-1 px-3">
            {Object.entries(boat.docs).map(([key,doc])=>(
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-600">{DOC_LABELS[key]}</span>
                {doc.status==='ok' && <span className="pill-ok">{doc.label}</span>}
                {doc.status==='warn' && <span className="pill-warn">{doc.label}</span>}
                {doc.status==='danger' && <span className="pill-danger">{doc.label}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal Fiche Client ────────────────────────────────────────────
function ClientModal({ clientId, skipper, checkIn, onClose }) {
  const client = CLIENTS?.find(c => c.id === clientId)
  if(!client) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center text-white font-display font-bold">{client.prenom[0]}{client.nom[0]}</div>
            <div><h2 className="font-display text-white text-base font-bold">{client.prenom} {client.nom}</h2><p className="text-navy-100 text-xs">{client.tel}</p></div>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <p className="section-label">Contact</p>
          <div className="flex flex-col gap-2 mb-4">
            <div className="card-sm flex items-center justify-between">
              <span className="text-xs text-gray-400">Téléphone</span>
              <span className="text-xs font-medium">{client.tel}</span>
            </div>
            {client.tel2 && (
              <div className="card-sm flex items-center justify-between">
                <span className="text-xs text-gray-400">Téléphone 2</span>
                <span className="text-xs font-medium">{client.tel2}</span>
              </div>
            )}
            <div className="card-sm flex items-center justify-between">
              <span className="text-xs text-gray-400">Email</span>
              <span className="text-xs font-medium truncate ml-2">{client.email}</span>
            </div>
          </div>

          {skipper && (
            <>
              <p className="section-label">Skipper de la location</p>
              <div className="card-sm flex items-center justify-between mb-4">
                <span className="text-xs font-medium">{skipper.name}</span>
                <a href={`tel:${skipper.phone}`} className="text-xs text-navy-600">{skipper.phone}</a>
              </div>
            </>
          )}

          <p className="section-label">Documents</p>
          <div className="flex flex-col gap-2 mb-4">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${client.pieceId.uploaded?'bg-teal-50 border-teal-100':'bg-danger-50 border-danger-100'}`}>
              <div><p className="text-xs font-medium">Pièce d'identité · {client.pieceId.type}</p>{client.pieceId.numero&&<p className="text-[10px] text-gray-400">{client.pieceId.numero}</p>}</div>
              {client.pieceId.uploaded?<span className="pill-ok">✓ OK</span>:<span className="pill-danger">⚠ Manquante</span>}
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl border ${client.permis.uploaded?'bg-teal-50 border-teal-100':'bg-amber-50 border-amber-100'}`}>
              <div><p className="text-xs font-medium">Permis · {client.permis.type||'Non renseigné'}</p></div>
              {client.permis.uploaded?<span className="pill-ok">✓ OK</span>:<span className="pill-warn">À uploader</span>}
            </div>
          </div>
          <p className="section-label">Caution</p>
          <div className={`flex items-center justify-between p-3 rounded-xl border ${client.caution.statut==='recue'?'bg-teal-50 border-teal-100':'bg-amber-50 border-amber-100'}`}>
            <p className="text-xs font-medium">{client.caution.montant}€ · {client.caution.mode}</p>
            {client.caution.statut==='recue'?<span className="pill-ok">Reçue ✓</span>:<span className="pill-warn">En attente</span>}
          </div>

          <p className="section-label mt-4">Check-in</p>
          {checkIn?.done ? (
            <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1"><CircleCheck size={14} className="text-teal-600 flex-shrink-0" /><p className="text-xs font-medium text-teal-800">Signé par le client</p></div>
              <p className="text-xs text-teal-700">{checkIn.checkedCount}/{checkIn.total} points vérifiés</p>
              {checkIn.remarks && <p className="text-xs text-teal-600 mt-1 italic">"{checkIn.remarks}"</p>}
              <p className="text-[10px] text-teal-500 mt-2">Consultation uniquement — non modifiable depuis cette fiche.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Pas encore effectué.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Check-in modal ────────────────────────────────────────────────
function CheckInModal({ mission, bookingId, booking, onClose, onComplete }) {
  const [step, setStep] = useState('list')
  const [, forceUpdate] = useState(0)
  const [signed, setSigned] = useState(false)
  const [collapsed, setCollapsed] = useState({})
  useEffect(() => subscribe(() => forceUpdate(v => v + 1)), [])

  // État persistant (survit à la fermeture de la fenêtre avant la fin du check-in).
  const progress = getCheckInProgress(bookingId)
  const checked = progress.checked
  const missing = progress.missing
  const remarks = progress.remarks

  // Draps et options de CETTE location : ils viennent grossir la checklist du check-in,
  // pour que le technicien les prépare et les coche comme le reste.
  const dynamicItems = []
  ;(booking?.draps || []).forEach((d, i) => dynamicItems.push({ id: `drap-${i}`, label: `Draps — ${d.name} × ${d.qty} ${d.unit}` }))
  Object.entries(booking?.options || {}).forEach(([optId, val]) => {
    if (!val) return
    const opt = OPTIONS_CATALOG.find(o => o.id === optId)
    if (!opt) return
    const qty = typeof val === 'object' ? val.qty : null
    dynamicItems.push({ id: `opt-${optId}`, label: qty ? `${opt.label} × ${qty}` : opt.label })
  })
  const checklistItems = dynamicItems.length > 0
    ? [...CHECKLIST_ITEMS, { category: 'Draps & options de cette location', items: dynamicItems }]
    : CHECKLIST_ITEMS
  const allItems = checklistItems.flatMap(c => c.items)

  const done = Object.values(checked).filter(Boolean).length
  const total = allItems.length
  const pct = Math.round((done/total)*100)
  const unchecked = allItems.filter(i => !checked[i.id])
  function toggle(id) { toggleCheckInItem(bookingId, id) }
  function toggleCat(cat) { setCollapsed(prev=>({...prev,[cat]:!prev[cat]})) }
  function checkAll(items) { const a=items.every(i=>checked[i.id]); setCheckInItemsBulk(bookingId, items.map(i=>i.id), !a) }
  function confirm() { completeCheckIn(bookingId,{remarks,missing,checkedCount:done,total}); onComplete(); setStep('done') }

  if(step==='done') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4"><CircleCheck size={36} className="text-teal-400"/></div>
        <h2 className="font-display text-xl font-bold mb-2">Check-in terminé !</h2>
        <p className="text-sm text-gray-400 mb-4">Signé · {done}/{total} points vérifiés</p>
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-6"><p className="text-xs text-teal-700">✓ L'agence voit l'avancement en temps réel.</p></div>
        <button className="btn-primary w-full justify-center" onClick={onClose}>Fermer</button>
      </div>
    </div>
  )

  if(step==='sign') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Signature client</h2>
          <button onClick={()=>setStep('recap')} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-5">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium mb-1">{mission.client} — {mission.boatName}</p>
            <p className="text-xs text-gray-400">{done}/{total} points vérifiés</p>
            {remarks&&<p className="text-xs text-gray-500 mt-1 italic">"{remarks}"</p>}
          </div>
          <p className="text-xs text-gray-400 mb-3">Je soussigné(e) confirme avoir pris connaissance de l'état des lieux.</p>
          <div className={`border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer mb-4 ${signed?'border-teal-400 bg-teal-50':'border-gray-200'}`} onClick={()=>setSigned(true)}>
            {signed?<div className="text-center"><p className="text-teal-700 font-medium text-sm">✓ Signé</p><p className="text-teal-600 text-xs mt-1">{mission.client}</p></div>
              :<div className="text-center"><PenLine size={22} className="text-gray-300 mx-auto mb-2"/><p className="text-xs text-gray-400">Appuyez pour signer</p></div>}
          </div>
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 justify-center" onClick={()=>setStep('recap')}>← Retour</button>
            <button className={`btn-primary flex-1 justify-center ${!signed?'opacity-50 cursor-not-allowed':''}`} disabled={!signed} onClick={confirm}><CircleCheck size={14}/> Valider</button>
          </div>
        </div>
      </div>
    </div>
  )

  if(step==='recap') return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Récapitulatif</h2>
          <button onClick={()=>setStep('list')} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-4"><p className="text-xs text-teal-800 font-medium">✓ {done}/{total} points vérifiés</p></div>
          {unchecked.length>0&&(<div className="mb-4"><p className="section-label">Éléments non cochés</p><div className="flex flex-col gap-2">
            {unchecked.map(item=>(
              <div key={item.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <span className="text-xs text-amber-800">{item.label}</span>
                <div className="flex items-center gap-2"><span className="text-[10px] text-amber-600">Manquant :</span>
                  <select className="text-xs border border-amber-200 rounded px-1.5 py-0.5 bg-white" value={missing[item.id]||'0'} onChange={e=>setCheckInMissing(bookingId, item.id, e.target.value)}>
                    {Array.from({length:13},(_,i)=><option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div></div>)}
          <p className="section-label">Remarques</p>
          <textarea className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600" rows={3} placeholder="Observations, dommages..." value={remarks} onChange={e=>setCheckInRemarks(bookingId, e.target.value)}/>
        </div>
        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={()=>setStep('list')}>← Retour</button>
          <button className="btn-primary flex-1 justify-center" onClick={()=>setStep('sign')}><PenLine size={14}/> Passer à la signature</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div><h2 className="font-display text-white text-base font-bold">Check-in — {mission.boatName}</h2><p className="text-navy-100 text-xs">{mission.client} · {mission.date}</p></div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18}/></button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-gray-600">{done}/{total} vérifiés</span><span className={`text-xs font-medium ${pct===100?'text-teal-600':pct>50?'text-amber-600':'text-gray-400'}`}>{pct}%</span></div>
          <div className="bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full transition-all ${pct===100?'bg-teal-400':pct>50?'bg-amber-300':'bg-navy-400'}`} style={{width:`${pct}%`}}/></div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {checklistItems.map(cat=>{
            const catDone=cat.items.every(i=>checked[i.id]); const isC=collapsed[cat.category]
            return (<div key={cat.category} className="mb-3">
              <div className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${catDone?'bg-teal-50 border border-teal-100':'bg-gray-50 border border-gray-100'}`} onClick={()=>toggleCat(cat.category)}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${catDone?'bg-teal-400':'bg-gray-200'}`}>{catDone&&<Check size={10} className="text-white"/>}</div>
                  <span className={`text-sm font-medium ${catDone?'text-teal-800':''}`}>{cat.category}</span>
                  <span className="text-xs text-gray-400">{cat.items.filter(i=>checked[i.id]).length}/{cat.items.length}</span>
                </div>
                <button className="text-[10px] text-navy-600 hover:underline" onClick={e=>{e.stopPropagation();checkAll(cat.items)}}>{cat.items.every(i=>checked[i.id])?'Tout décocher':'Tout cocher'}</button>
              </div>
              {!isC&&(<div className="mt-1 pl-2 flex flex-col gap-1">
                {cat.items.map(item=>(
                  <div key={item.id} onClick={()=>toggle(item.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer ${checked[item.id]?'bg-teal-50':'hover:bg-gray-50'}`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${checked[item.id]?'bg-teal-400':'border border-gray-300'}`}>{checked[item.id]&&<Check size={9} className="text-white"/>}</div>
                    <span className={`text-sm ${checked[item.id]?'text-teal-800 line-through opacity-60':'text-gray-700'}`}>{item.label}</span>
                  </div>
                ))}
              </div>)}
            </div>)
          })}
        </div>
        <div className="border-t border-gray-100 p-4 flex-shrink-0">
          {unchecked.length>0&&(<div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3"><AlertTriangle size={12} className="text-amber-600 flex-shrink-0"/><p className="text-xs text-amber-700">{unchecked.length} élément{unchecked.length>1?'s':''} non coché{unchecked.length>1?'s':''}.</p></div>)}
          <button className="btn-primary w-full justify-center" onClick={()=>setStep('recap')}><FileText size={14}/> {unchecked.length>0?'Continuer →':'Récapitulatif →'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Planning technicien (semaine + mois) ─────────────────────────
function TechPlanning({ tech, missions, sharedState, onSelectMission }) {
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date('2026-07-04'))
  const DAYS = ['Sam','Dim','Lun','Mar','Mer','Jeu','Ven']

  const weekDays = Array.from({length:7},(_,i)=>addDays(currentDate,i))

  function navigate(dir) {
    if(view==='week') setCurrentDate(d=>addDays(d,dir*7))
    else setCurrentDate(d=>{const n=new Date(d);n.setMonth(n.getMonth()+dir);return n})
  }

  function getMissionsForDay(dayStr) {
    return missions.filter(m => m.date === dayStr)
  }

  function getAllBookingsForDay(day) {
    return BOOKINGS.filter(b => {
      try { return isWithinInterval(day,{start:parseISO(b.start),end:parseISO(b.end)}) } catch{return false}
    })
  }

  function isTechMission(missionDate) {
    return missions.some(m => m.date === missionDate)
  }

  const label = view==='week'
    ? `${format(weekDays[0],'d MMM',{locale:fr})} → ${format(weekDays[6],'d MMM yyyy',{locale:fr})}`
    : format(currentDate,'MMMM yyyy',{locale:fr})

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Planning</h1>
          <p className="text-xs text-gray-400 capitalize">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {[{id:'week',l:'Semaine'},{id:'month',l:'Mois'}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view===v.id?'bg-navy-600 text-white':'bg-white text-gray-500 hover:bg-gray-50'}`}>{v.l}</button>
            ))}
          </div>
          <button className="btn-ghost py-1.5 px-2" onClick={()=>navigate(-1)}><ChevronLeft size={14}/></button>
          <button className="btn-ghost py-1.5 px-2" onClick={()=>navigate(1)}><ChevronRight size={14}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {/* Légende */}
        <div className="flex gap-4 mb-3">
          {[{bg:'bg-teal-100',l:'Mes missions'},{bg:'bg-gray-100',l:'Autres bateaux'}].map(({bg,l})=>(
            <div key={l} className="flex items-center gap-1.5 text-xs text-gray-400"><div className={`w-3 h-3 rounded ${bg}`}/>{l}</div>
          ))}
        </div>

        {/* VUE SEMAINE */}
        {view==='week' && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="grid bg-navy-900" style={{gridTemplateColumns:'90px repeat(7,1fr)'}}>
              <div className="border-r border-navy-800 py-2"/>
              {weekDays.map((day,i)=>(
                <div key={i} className="py-2 px-1 text-center border-r border-navy-800 last:border-0">
                  <div className="text-[9px] text-navy-100 uppercase">{DAYS[i]}</div>
                  <div className="text-sm font-medium text-white">{format(day,'d')}</div>
                </div>
              ))}
            </div>
            {/* Ligne par bateau de la flotte */}
            {BOATS.filter(b=>b.brand==='midi-nautisme').map(boat => {
              const isMine = tech.base === 'Vieux-Port' ? ['mn-1','mn-2','mn-3','mn-4'].includes(boat.id) : ['mn-5','mn-6','mn-7'].includes(boat.id)
              const bookingsThisWeek = weekDays.some(d => getAllBookingsForDay(d).some(bk=>bk.boatId===boat.id))
              const myMissionsThisWeek = missions.filter(m => m.boatId===boat.id && weekDays.some(d=>format(d,'yyyy-MM-dd')===m.date))

              return (
                <div key={boat.id} className="grid border-t border-gray-100" style={{gridTemplateColumns:'90px repeat(7,1fr)',minHeight:52}}>
                  <div className={`border-r border-gray-100 px-3 py-2 flex flex-col justify-center ${isMine?'bg-navy-50':'bg-gray-50'}`}>
                    <p className={`text-xs font-medium leading-tight truncate ${isMine?'text-navy-700':'text-gray-400'}`}>{boat.name.split('—')[0].trim()}</p>
                    <p className="text-[10px] text-gray-400">{boat.type}</p>
                  </div>
                  <div className="col-span-7 relative">
                    <div className="grid h-full absolute inset-0" style={{gridTemplateColumns:'repeat(7,1fr)'}}>
                      {weekDays.map((_,i)=><div key={i} className="border-r border-gray-100 last:border-0 bg-white"/>)}
                    </div>
                    {/* Blocs de locs normales en gris */}
                    {BOOKINGS.filter(bk=>bk.boatId===boat.id).map(bk=>{
                      const s=parseISO(bk.start),e=parseISO(bk.end)
                      let si=weekDays.findIndex(d=>format(d,'yyyy-MM-dd')===format(s,'yyyy-MM-dd'))
                      let ei=weekDays.findIndex(d=>format(d,'yyyy-MM-dd')===format(e,'yyyy-MM-dd'))
                      if(si===-1)si=0; if(ei===-1)ei=6
                      if(!weekDays.some(d=>isWithinInterval(d,{start:s,end:e})))return null
                      return (
                        <div key={bk.id} style={{position:'absolute',top:6,bottom:6,left:`${(si/7)*100+0.3}%`,width:`${((ei-si)/7)*100-0.6}%`,borderRadius:6,background:isMine?'#E6F1FB':'#f3f4f6',border:`1px solid ${isMine?'#B5D4F4':'#e5e7eb'}`,padding:'3px 6px',overflow:'hidden'}}>
                          <p style={{fontSize:10,fontWeight:500,color:isMine?'#185FA5':'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{bk.client.split(' ')[0]}</p>
                        </div>
                      )
                    })}
                    {/* Mes missions en couleur vive */}
                    {myMissionsThisWeek.map(m=>{
                      const di=weekDays.findIndex(d=>format(d,'yyyy-MM-dd')===m.date)
                      if(di===-1)return null
                      const tasks=sharedState.techTasks[tech.id]?.[m.id]||[]
                      const done=tasks.filter(t=>t.done).length
                      return (
                        <div key={m.id} onClick={()=>onSelectMission(m.id)}
                          style={{position:'absolute',top:2,bottom:2,left:`${(di/7)*100+0.5}%`,width:`${(1/7)*100-1}%`,borderRadius:6,background:m.type==='depart'?'#185FA5':'#0F6E56',padding:'3px 4px',cursor:'pointer',zIndex:2}}
                        >
                          <p style={{fontSize:9,color:'#fff',fontWeight:700,textAlign:'center'}}>{m.type==='depart'?'↗':'↙'}</p>
                          <p style={{fontSize:9,color:'#fff',opacity:0.9,textAlign:'center',whiteSpace:'nowrap',overflow:'hidden'}}>{m.heure}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* VUE MOIS */}
        {view==='month' && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-navy-900">
              {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>(
                <div key={d} className="py-2 text-center"><p className="text-[10px] text-navy-100 uppercase tracking-wide">{d}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array((getDay(startOfMonth(currentDate))+6)%7).fill(null).map((_,i)=>(
                <div key={`b${i}`} className="min-h-24 bg-gray-50 border-r border-b border-gray-100"/>
              ))}
              {eachDayOfInterval({start:startOfMonth(currentDate),end:endOfMonth(currentDate)}).map(day=>{
                const dayStr=format(day,'yyyy-MM-dd')
                const myMissions=missions.filter(m=>m.date===dayStr)
                const otherBookings=BOOKINGS.filter(bk=>!myMissions.some(m=>m.bookingId===bk.id)&&isWithinInterval(day,{start:parseISO(bk.start),end:parseISO(bk.end)}))
                const isToday=dayStr===format(new Date(),'yyyy-MM-dd')
                return (
                  <div key={dayStr} className="min-h-24 border-r border-b border-gray-100 bg-white p-1">
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday?'bg-navy-600 text-white':'text-gray-500'}`}>{format(day,'d')}</div>
                    <div className="flex flex-col gap-0.5">
                      {/* Mes missions en couleur */}
                      {myMissions.map(m=>(
                        <div key={m.id} onClick={()=>onSelectMission(m.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate hover:opacity-80"
                          style={{background:m.type==='depart'?'#185FA5':'#0F6E56',color:'#fff',fontWeight:500}}
                        >
                          {m.type==='depart'?'↗':'↙'} {m.boatName.split('—')[0].split('·')[0].trim()}
                        </div>
                      ))}
                      {/* Autres locs en gris */}
                      {otherBookings.slice(0,2).map(bk=>(
                        <div key={bk.id} className="text-[10px] px-1.5 py-0.5 rounded truncate" style={{background:'#f3f4f6',color:'#9ca3af'}}>
                          {bk.boatName.split('—')[0].split('·')[0].trim()}
                        </div>
                      ))}
                      {otherBookings.length>2&&<p className="text-[10px] text-gray-400 px-1">+{otherBookings.length-2}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vue détail mission ────────────────────────────────────────────
function TechMission({ tech, mission, tasks, onBack, onToggle, sharedState }) {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showCheckOut, setShowCheckOut] = useState(false)
  const [showBoat, setShowBoat] = useState(false)
  const [showClient, setShowClient] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [requestMsg, setRequestMsg] = useState('')
  const checkInDone = sharedState.checkIns[mission.bookingId]?.done
  const done = tasks.filter(t=>t.done).length
  const pct = tasks.length ? Math.round((done/tasks.length)*100) : 0
  const boat = BOATS.find(b=>b.id===mission.boatId)
  const client = CLIENTS?.find(c=>c.id===mission.clientId)
  const skipper = mission.skipperId ? SKIPPERS.find(s=>s.id===mission.skipperId) : null
  const isDepart = mission.type==='depart'
  const realBooking = BOOKINGS.find(b => b.id === mission.bookingId)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div className="flex items-center gap-2">
          <button className="btn-ghost py-1.5 px-2" onClick={onBack}><ChevronLeft size={14}/></button>
          <div>
            <h1 className="font-display text-base font-bold">{isDepart?'↗ Départ':'↙ Retour'} — {mission.boatName}</h1>
            <p className="text-xs text-gray-400">{mission.date} · {mission.heure}</p>
          </div>
        </div>
        {checkInDone?<span className="pill-ok flex items-center gap-1"><CircleCheck size={11}/>Check-in OK</span>
          :<span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pct===100?'pill-ok':'pill-warn'}`}>{pct}%</span>}
      </div>
      <div className="flex-1 overflow-auto p-5">
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Avancement</p><p className="text-sm font-medium" style={{color:pct===100?'#0F6E56':'#854F0B'}}>{done}/{tasks.length}</p></div>
          <div className="bg-gray-100 rounded-full h-3"><div className="h-3 rounded-full transition-all" style={{width:`${pct}%`,background:pct===100?'#1D9E75':pct>50?'#EF9F27':'#185FA5'}}/></div>
          {pct===100&&!checkInDone&&<p className="text-xs text-teal-600 text-center mt-2 font-medium">✓ Prêt pour le check-in !</p>}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card cursor-pointer hover:border-navy-200 transition-colors" onClick={()=>setShowBoat(true)}>
            <div className="flex items-center gap-1.5 mb-2"><Anchor size={13} className="text-navy-600"/><p className="text-xs font-medium">Bateau</p><ChevronRight size={11} className="text-navy-400 ml-auto"/></div>
            <p className="text-sm font-medium mb-0.5">{mission.boatName.split('—')[0].trim()}</p>
            {boat&&<p className="text-xs text-gray-400">{boat.type} · {boat.length}m</p>}
            {boat&&(<div className="mt-2 flex flex-col gap-1">{Object.entries(boat.docs).slice(0,2).map(([key,doc])=>(
              <div key={key} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{key==='francisation'?'Francisat.':'Assurance'}</span>
                <span style={{fontSize:9,fontWeight:500,padding:'1px 5px',borderRadius:10,background:doc.status==='ok'?'#E1F5EE':'#FCEBEB',color:doc.status==='ok'?'#085041':'#791F1F'}}>{doc.status==='ok'?'✓':'⚠'}</span>
              </div>
            ))}</div>)}
            <p className="text-[10px] text-navy-600 mt-2">Voir fiche →</p>
          </div>
          <div className="card cursor-pointer hover:border-navy-200 transition-colors" onClick={()=>setShowClient(true)}>
            <div className="flex items-center gap-1.5 mb-2"><Users size={13} className="text-navy-600"/><p className="text-xs font-medium">Client</p><ChevronRight size={11} className="text-navy-400 ml-auto"/></div>
            <p className="text-sm font-medium mb-0.5">{mission.client}</p>
            {client&&<p className="text-xs text-gray-400">{client.tel}</p>}
            {client&&(<div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between"><span className="text-[10px] text-gray-400">Pièce d'identité</span><span style={{fontSize:9,fontWeight:500,padding:'1px 5px',borderRadius:10,background:client.pieceId.uploaded?'#E1F5EE':'#FCEBEB',color:client.pieceId.uploaded?'#085041':'#791F1F'}}>{client.pieceId.uploaded?'✓':'⚠'}</span></div>
              <div className="flex items-center justify-between"><span className="text-[10px] text-gray-400">Caution</span><span style={{fontSize:9,fontWeight:500,padding:'1px 5px',borderRadius:10,background:client.caution.statut==='recue'?'#E1F5EE':'#FAEEDA',color:client.caution.statut==='recue'?'#085041':'#633806'}}>{client.caution.statut==='recue'?'✓':'⏳'}</span></div>
            </div>)}
            <p className="text-[10px] text-navy-600 mt-2">Voir fiche →</p>
          </div>
        </div>

        {skipper&&(<div className="card mb-4"><p className="section-label">Skipper assigné</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center text-navy-800 text-xs font-medium flex-shrink-0">{skipper.initials}</div>
            <div className="flex-1"><p className="text-sm font-medium">{skipper.name}</p><p className="text-xs text-gray-400">{skipper.permis.slice(0,2).join(', ')}</p></div>
            <a href={`tel:${skipper.phone}`} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"><Phone size={12}/>{skipper.phone}</a>
          </div>
        </div>)}

        <MenageStatusCard mission={mission} />

        <p className="section-label">Tâches de préparation</p>
        <div className="flex flex-col gap-2 mb-4">
          {tasks.map(task=>(
            <div key={task.id} onClick={()=>onToggle(task.id)} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all"
              style={{background:task.done?'#E1F5EE':task.alert?'#FCEBEB':'#fff',border:`1px solid ${task.done?'#9FE1CB':task.alert?'#F7C1C1':'#f3f4f6'}`}}>
              <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:task.done?'#1D9E75':'transparent',border:task.done?'none':`2px solid ${task.alert?'#F7C1C1':'#d1d5db'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {task.done&&<Check size={12} color="#fff" strokeWidth={3}/>}
              </div>
              <span style={{fontSize:14,flex:1,color:task.done?'#085041':task.alert?'#791F1F':'#374151',textDecoration:task.done?'line-through':'none',opacity:task.done?0.7:1,fontWeight:task.alert&&!task.done?600:400}}>{task.label}</span>
              {task.alert&&!task.done&&<AlertTriangle size={14} style={{color:'#A32D2D',flexShrink:0}}/>}
            </div>
          ))}
        </div>

        <p className="section-label">Notes</p>
        <textarea
          className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600 mb-3"
          rows={3}
          placeholder="Une remarque sur cette mission (accès, état particulier, consigne...)"
          value={sharedState.missionNotes[mission.bookingId] || ''}
          onChange={e => setMissionNote(mission.bookingId, e.target.value)}
        />

        <button
          className="btn-ghost w-full justify-center py-2 mb-4 text-danger-700 border border-danger-100 bg-danger-50 hover:bg-danger-100"
          onClick={() => setShowRequest(true)}
        >
          <AlertOctagon size={14} /> Signaler un empêchement
        </button>

        {showRequest && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-6" onClick={() => setShowRequest(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold mb-1">Signaler un empêchement</p>
              <p className="text-xs text-gray-400 mb-3">L'agence sera prévenue et pourra réassigner cette mission à quelqu'un d'autre.</p>
              <textarea
                className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600 mb-3"
                rows={3}
                placeholder="Ex : je suis malade, je ne pourrai pas être là samedi matin..."
                value={requestMsg}
                onChange={e => setRequestMsg(e.target.value)}
              />
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 justify-center" onClick={() => setShowRequest(false)}>Annuler</button>
                <button
                  className="btn-primary flex-1 justify-center"
                  disabled={!requestMsg.trim()}
                  onClick={() => { addMissionRequest(mission.key, tech.id, tech.name, requestMsg); setRequestMsg(''); setShowRequest(false) }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        )}

        {isDepart ? (
          !checkInDone
            ? <button className="btn-primary w-full justify-center py-3" onClick={()=>setShowCheckIn(true)}><ClipboardCheck size={16}/> Démarrer le check-in client</button>
            : <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-100 rounded-xl p-3"><CircleCheck size={18} className="text-teal-600 flex-shrink-0"/><div><p className="text-sm font-medium text-teal-800">Check-in complété</p><p className="text-xs text-teal-600">Visible en temps réel par l'agence</p></div></div>
        ) : (
          realBooking
            ? <button className="btn-primary w-full justify-center py-3" onClick={()=>setShowCheckOut(true)}><ClipboardCheck size={16}/> Démarrer le check-out</button>
            : <p className="text-xs text-gray-400 text-center py-2">Location introuvable pour ce check-out.</p>
        )}
      </div>

      {showCheckIn&&<CheckInModal mission={mission} bookingId={mission.bookingId} booking={realBooking} onClose={()=>setShowCheckIn(false)} onComplete={()=>setShowCheckIn(false)}/>}
      {showCheckOut&&realBooking&&<CheckOutModal booking={realBooking} onClose={()=>setShowCheckOut(false)}/>}
      {showBoat&&<BoatModal boatId={mission.boatId} onClose={()=>setShowBoat(false)}/>}
      {showClient&&<ClientModal clientId={mission.clientId} skipper={skipper} checkIn={sharedState.checkIns[mission.bookingId]} onClose={()=>setShowClient(false)}/>}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────
export default function TechnicienDashboard({ onLogout }) {
  const [selectedTech, setSelectedTechState] = useState(null)
  const [selectedMission, setSelectedMission] = useState(null)
  const [activeView, setActiveViewState] = useState('equipe')
  // Technicien connecté en démo = Karim (tech-1). « Mon planning » ouvre SON planning
  // (avant, le bouton ne faisait rien tant qu'aucun technicien n'était sélectionné).
  const ME = 'tech-1'
  const setSelectedTech = id => setSelectedTechState(id)
  const setActiveView = v => {
    setActiveViewState(v)
    if (v === 'planning' && !selectedTech) setSelectedTechState(ME)
    if (v === 'equipe') { setSelectedTechState(null); setSelectedMission(null) }
  }
  const [sharedState, setSharedState] = useState(getState())

  useEffect(() => subscribe(s=>setSharedState(s)), [])

  const tech = TECH_META.find(t=>t.id===selectedTech)
  const missions = selectedTech ? getTechMissions(selectedTech) : []

  function handleToggle(techId, missionId, taskId) {
    toggleTask(techId, missionId, taskId)
  }

  // Vue détail mission
  if(selectedTech && selectedMission && tech) {
    const mission = missions.find(m=>m.id===selectedMission)
    const tasks = sharedState.techTasks[tech.id]?.[mission.id] || []
    return (
      <div className="flex h-screen h-dvh overflow-hidden bg-gray-50">
        <TechSidebar tech={tech} onLogout={onLogout} activeView={activeView} setView={setActiveView}/>
        <main className="flex-1 flex flex-col overflow-hidden">
          <TechMission tech={tech} mission={mission} tasks={tasks} sharedState={sharedState}
            onBack={()=>setSelectedMission(null)} onToggle={taskId=>handleToggle(tech.id,mission.id,taskId)}/>
        </main>
      </div>
    )
  }

  // Vue planning technicien
  if(selectedTech && tech && activeView==='planning') {
    return (
      <div className="flex h-screen h-dvh overflow-hidden bg-gray-50">
        <TechSidebar tech={tech} onLogout={onLogout} activeView={activeView} setView={setActiveView}/>
        <main className="flex-1 flex flex-col overflow-hidden">
          <TechPlanning tech={tech} missions={missions} sharedState={sharedState} onSelectMission={setSelectedMission}/>
        </main>
      </div>
    )
  }

  // Vue équipe ou missions du technicien sélectionné
  if(selectedTech && tech) {
    return (
      <div className="flex h-screen h-dvh overflow-hidden bg-gray-50">
        <TechSidebar tech={tech} onLogout={onLogout} activeView={activeView} setView={v=>{setActiveView(v)}}/>
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="topbar">
            <div className="flex items-center gap-2">
              <button className="btn-ghost py-1.5 px-2" onClick={()=>{setSelectedTech(null);setActiveView('equipe')}}><ChevronLeft size={14}/></button>
              <div><h1 className="font-display text-base font-bold">{tech.name}</h1><p className="text-xs text-gray-400">{tech.base} · {missions.length} mission{missions.length>1?'s':''}</p></div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:tech.color}}>{tech.initials}</div>
          </div>
          <div className="flex-1 overflow-auto p-5">
            {/* Grouper par date */}
            {Object.entries(missions.reduce((acc,m)=>{if(!acc[m.date])acc[m.date]=[];acc[m.date].push(m);return acc},{})).sort().map(([date,dayMissions])=>(
              <div key={date} className="mb-5">
                <div className="flex items-center gap-2 mb-3"><Calendar size={14} className="text-navy-600"/><p className="text-sm font-medium">{new Date(date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</p></div>
                <div className="flex flex-col gap-3 pl-5 border-l-2 border-navy-100">
                  {dayMissions.map(mission=>{
                    const tasks=sharedState.techTasks[tech.id]?.[mission.id]||[]
                    const done=tasks.filter(t=>t.done).length
                    const pct=tasks.length?Math.round((done/tasks.length)*100):0
                    const hasAlert=tasks.some(t=>t.alert&&!t.done)
                    const checkInDone=sharedState.checkIns[mission.bookingId]?.done
                    const isDepart=mission.type==='depart'
                    return (
                      <div key={mission.id} onClick={()=>setSelectedMission(mission.id)} className="card cursor-pointer hover:shadow-sm transition-all" style={{borderColor:hasAlert?'#FAC775':'#f3f4f6'}}>
                        <div style={{background:isDepart?'#E6F1FB':'#E1F5EE',borderRadius:8,padding:'7px 12px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span style={{fontSize:12,fontWeight:600,color:isDepart?'#0C447C':'#085041'}}>{isDepart?'↗ Départ':'↙ Retour'} · {mission.heure}</span>
                          <div className="flex items-center gap-2">{hasAlert&&<AlertTriangle size={12} style={{color:'#854F0B'}}/>}{checkInDone&&<span className="pill-ok text-[10px]">Check-in ✓</span>}</div>
                        </div>
                        <p className="font-display text-sm font-bold mb-0.5">{mission.boatName}</p>
                        <p className="text-xs text-gray-400 mb-2">{mission.client}</p>
                        <div className="bg-gray-100 rounded-full h-1.5 mb-1"><div className="h-1.5 rounded-full" style={{width:`${pct}%`,background:pct===100?'#1D9E75':hasAlert?'#EF9F27':'#185FA5'}}/></div>
                        <div className="flex items-center justify-between"><p className="text-xs text-gray-400">{done}/{tasks.length} tâches</p><ChevronRight size={13} className="text-gray-300"/></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Vue liste équipe
  return (
    <div className="flex h-screen h-dvh overflow-hidden bg-gray-50">
      <TechSidebar tech={TECH_META[0]} onLogout={onLogout} activeView={activeView} setView={setActiveView}/>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="topbar"><div><h1 className="font-display text-base font-bold">Équipe</h1><p className="text-xs text-gray-400">{TECH_META.length} techniciens</p></div></div>
        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-3">
            {TECH_META.map(t=>{
              const tMissions=getTechMissions(t.id)
              const totalDone=tMissions.reduce((acc,m)=>acc+(sharedState.techTasks[t.id]?.[m.id]||[]).filter(tk=>tk.done).length,0)
              const totalTasks=tMissions.reduce((acc,m)=>acc+(sharedState.techTasks[t.id]?.[m.id]||[]).length,0)
              const hasAlert=tMissions.some(m=>(sharedState.techTasks[t.id]?.[m.id]||[]).some(tk=>tk.alert&&!tk.done))
              return (
                <div key={t.id} onClick={()=>{setSelectedTech(t.id);setActiveView('equipe')}} className="card cursor-pointer hover:shadow-sm transition-all" style={{borderColor:hasAlert?'#FAC775':'#f3f4f6'}}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0" style={{background:t.color}}>{t.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5"><p className="font-medium text-sm">{t.name}</p>{hasAlert&&<AlertTriangle size={12} style={{color:'#854F0B'}}/>}</div>
                      <p className="text-xs text-gray-400">{t.base} · {tMissions.length} mission{tMissions.length>1?'s':''}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0"/>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {tMissions.slice(0,3).map(m=>(
                      <span key={m.id} style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:m.type==='depart'?'#E6F1FB':'#E1F5EE',color:m.type==='depart'?'#0C447C':'#085041'}}>
                        {m.type==='depart'?'↗':'↙'} {m.boatName.split('—')[0].split('·')[0].trim()} · {m.heure}
                      </span>
                    ))}
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${totalTasks>0?Math.round((totalDone/totalTasks)*100):0}%`,background:hasAlert?'#EF9F27':'#185FA5'}}/></div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
