import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, Search, Upload, Check, ChevronRight, User, Phone, Mail, FileText, Shield, CreditCard, AlertTriangle, Pencil } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { CLIENTS, BOOKINGS, BOATS, DOC_LABELS } from '@/lib/mock-data'
import { Card, SectionLabel } from '@/components/ui'
import FileUpload from '@/components/ui/FileUpload'

const PERMIS_TYPES = ['Côtier', 'Hauturier', 'Fluvial', 'Yachtmaster', 'Aucun']
const CAUTION_MODES = ['CB', 'Chèque', 'Virement', 'Empreinte CB']

const TODAY = new Date('2026-07-04')

// Une alerte client n'est "urgente" (danger/warn) que si sa prochaine loc est proche.
function getClientAlerts(client, bookings = []) {
  const alerts = []
  const clientBookings = bookings.filter(b => client.locations.includes(b.id))
  const nextBooking = clientBookings
    .map(b => { try { return { ...b, daysUntil: differenceInDays(parseISO(b.start), TODAY) } } catch { return null } })
    .filter(b => b && b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0]

  const isUrgent = nextBooking && nextBooking.daysUntil <= 7
  const isSoon = nextBooking && nextBooking.daysUntil <= 14

  if (!client.pieceId.uploaded) {
    alerts.push({ id: 'pieceId', type: isUrgent ? 'danger' : isSoon ? 'warn' : 'info', msg: "Pièce d'identité à compléter" })
  }
  if (!client.permis.uploaded && client.permis.type) {
    alerts.push({ id: 'permis', type: isSoon ? 'warn' : 'info', msg: 'Permis à uploader' })
  }
  if (client.caution.statut === 'en_attente') {
    alerts.push({ id: 'caution', type: isUrgent ? 'warn' : 'info', msg: `Caution en attente (${client.caution.montant}€)` })
  }
  return alerts
}

function ClientCard({ client, onSelect }) {
  const alerts = getClientAlerts(client, BOOKINGS)
  const hasDanger = alerts.some(a => a.type === 'danger')
  const hasWarn = alerts.some(a => a.type === 'warn')

  return (
    <div
      className={`card cursor-pointer hover:shadow-sm transition-all ${hasDanger ? 'border-danger-100' : hasWarn ? 'border-amber-100' : ''}`}
      onClick={() => onSelect(client)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-600 font-display font-bold text-sm flex-shrink-0">
          {client.prenom[0]}{client.nom[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{client.prenom} {client.nom}</p>
          <p className="text-xs text-gray-400">{client.tel} · {client.email}</p>
          <div className="flex gap-1 mt-1 flex-wrap">
            {client.permis.type && <span className="text-[10px] bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">{client.permis.type}</span>}
            {client.locations.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{client.locations.length} location{client.locations.length > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasDanger && <span className="pill-danger text-[10px]">Doc manquant</span>}
          {!hasDanger && hasWarn && <span className="pill-warn text-[10px]">À compléter</span>}
          {!hasDanger && !hasWarn && <span className="pill-ok text-[10px]">Complet</span>}
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>
    </div>
  )
}

// ── Modal édition caution ──────────────────────────────────────────
function CautionEditModal({ caution, onClose, onSave }) {
  const [montant, setMontant] = useState(caution.montant)
  const [mode, setMode] = useState(caution.mode)
  const [dateLimit, setDateLimit] = useState(caution.dateLimite || '')
  const [showUpload, setShowUpload] = useState(false)
  const [justificatif, setJustificatif] = useState(caution.justificatif || null)

  function save(statut) {
    onSave({ montant: parseInt(montant) || 0, mode, dateLimite: dateLimit, statut, justificatif })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Caution</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <p className="text-xs text-gray-400 mb-1.5">Montant (€)</p>
          <input type="number" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-navy-600" value={montant} onChange={e => setMontant(e.target.value)} />

          <p className="text-xs text-gray-400 mb-1.5">Moyen de paiement</p>
          <select className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg mb-3 bg-white focus:outline-none focus:border-navy-600" value={mode} onChange={e => setMode(e.target.value)}>
            {CAUTION_MODES.map(m => <option key={m}>{m}</option>)}
          </select>

          <p className="text-xs text-gray-400 mb-1.5">Date limite de réception</p>
          <input type="date" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-navy-600" value={dateLimit} onChange={e => setDateLimit(e.target.value)} />

          <p className="text-xs text-gray-400 mb-1.5">Justificatif</p>
          {justificatif ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50 border border-teal-100 mb-3">
              <span className="text-xs text-teal-700 truncate">{justificatif}</span>
              <button className="text-xs text-navy-600 hover:underline flex-shrink-0 ml-2" onClick={() => setShowUpload(true)}>Remplacer</button>
            </div>
          ) : showUpload ? (
            <div className="mb-3"><FileUpload onUpload={name => { setJustificatif(name); setShowUpload(false) }} /></div>
          ) : (
            <button className="w-full text-xs text-navy-600 border border-dashed border-gray-200 rounded-lg py-2.5 mb-3 hover:bg-gray-50" onClick={() => setShowUpload(true)}>+ Joindre un justificatif</button>
          )}
        </div>
        <div className="border-t border-gray-100 p-4 flex gap-2 flex-shrink-0">
          <button className="btn-ghost flex-1 justify-center text-xs" onClick={() => save('en_attente')}>Enregistrer</button>
          <button className="btn-primary flex-1 justify-center text-xs" onClick={() => save('recue')}><Check size={13} /> Marquer reçue</button>
        </div>
      </div>
    </div>
  )
}

// ── Fiche loc historique (lecture simple, sans badges de statut) ───
function BookingHistoryDetail({ booking, onClose }) {
  const boat = BOATS.find(b => b.id === booking.boatId)
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-white text-base font-bold">{booking.boatName}</h2>
            <p className="text-navy-100 text-xs">{booking.start} → {booking.end}</p>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="card-sm"><p className="text-[10px] text-gray-400 mb-1">Client</p><p className="text-xs font-medium">{booking.client}</p></div>
            <div className="card-sm"><p className="text-[10px] text-gray-400 mb-1">Personnes</p><p className="text-xs font-medium">{booking.guests}</p></div>
            {booking.skipperName && <div className="card-sm"><p className="text-[10px] text-gray-400 mb-1">Skipper</p><p className="text-xs font-medium">{booking.skipperName}</p></div>}
            {boat && <div className="card-sm"><p className="text-[10px] text-gray-400 mb-1">Type bateau</p><p className="text-xs font-medium">{boat.type} · {boat.length}m</p></div>}
          </div>

          {boat && (
            <>
              <SectionLabel>Documents du bateau (à la date de la location)</SectionLabel>
              <div className="card py-1 px-3 mb-4">
                {Object.entries(boat.docs).map(([key, doc]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-600">{DOC_LABELS[key]}</span>
                    <span className="text-xs text-gray-400">{doc.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {booking.draps?.length > 0 && (
            <>
              <SectionLabel>Draps & linge</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {booking.draps.map((d, i) => <span key={i} className="text-xs bg-gray-50 px-2.5 py-1 rounded-full text-gray-600">{d.name} × {d.qty}</span>)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientDetail({ client, onClose }) {
  const [docs, setDocs] = useState({
    pieceId: client.pieceId.uploaded,
    permis: client.permis.uploaded,
  })
  const [caution, setCaution] = useState({ ...client.caution })
  const [uploadTarget, setUploadTarget] = useState(null)
  const [showCautionEdit, setShowCautionEdit] = useState(false)
  const [historyBooking, setHistoryBooking] = useState(null)

  const localClient = { ...client, pieceId: { ...client.pieceId, uploaded: docs.pieceId }, permis: { ...client.permis, uploaded: docs.permis }, caution }
  const alerts = getClientAlerts(localClient, BOOKINGS)
  const bookings = BOOKINGS.filter(b => client.locations.includes(b.id))

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-600 flex items-center justify-center text-white font-display font-bold">
              {client.prenom[0]}{client.nom[0]}
            </div>
            <div>
              <h2 className="font-display text-white text-base font-bold">{client.prenom} {client.nom}</h2>
              <p className="text-navy-100 text-xs">{client.email} · {client.tel}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 grid grid-cols-2 gap-5">
          <div>
            {alerts.length > 0 && (
              <div className="mb-4">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg p-2.5 mb-2 text-xs ${a.type === 'danger' ? 'bg-danger-50 border border-danger-100 text-danger-800' : a.type === 'warn' ? 'bg-amber-50 border border-amber-100 text-amber-800' : 'bg-gray-50 border border-gray-100 text-gray-500'}`}>
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    {a.msg}
                  </div>
                ))}
              </div>
            )}

            <SectionLabel>Informations personnelles</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                ['Nom', client.nom],
                ['Prénom', client.prenom],
                ['Téléphone', client.tel],
                ['Email', client.email],
                ['Date de naissance', client.naissance],
                ['Nationalité', client.nationalite],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                  <p className="text-xs font-medium">{val || '—'}</p>
                </div>
              ))}
            </div>

            <SectionLabel>Caution</SectionLabel>
            <div className={`rounded-xl p-3 border mb-4 cursor-pointer hover:opacity-90 transition-opacity ${caution.statut === 'recue' ? 'bg-teal-50 border-teal-100' : 'bg-amber-50 border-amber-100'}`} onClick={() => setShowCautionEdit(true)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{caution.montant}€</p>
                  <p className="text-xs text-gray-500">{caution.mode}{caution.dateLimite ? ` · avant le ${caution.dateLimite}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {caution.statut === 'recue'
                    ? <span className="pill-ok">Reçue ✓</span>
                    : <span className="pill-warn">En attente</span>
                  }
                  <Pencil size={12} className="text-gray-400" />
                </div>
              </div>
            </div>

            {client.notes && (
              <div>
                <SectionLabel>Notes internes</SectionLabel>
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 italic">"{client.notes}"</div>
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Documents</SectionLabel>
            <div className="flex flex-col gap-3 mb-4">
              <div className={`flex items-center justify-between p-3 rounded-xl border ${docs.pieceId ? 'bg-teal-50 border-teal-100' : 'bg-danger-50 border-danger-100'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${docs.pieceId ? 'bg-teal-400' : 'bg-danger-400'}`}>
                    {docs.pieceId ? <Check size={12} className="text-white" /> : <AlertTriangle size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Pièce d'identité</p>
                    <p className="text-[10px] text-gray-400">{client.pieceId.type}{client.pieceId.numero ? ` · ${client.pieceId.numero}` : ''}</p>
                  </div>
                </div>
                <button className="text-xs text-navy-600 hover:underline" onClick={() => setUploadTarget('pieceId')}>
                  {docs.pieceId ? 'Remplacer' : 'Uploader'}
                </button>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-xl border ${docs.permis ? 'bg-teal-50 border-teal-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${docs.permis ? 'bg-teal-400' : 'bg-amber-300'}`}>
                    {docs.permis ? <Check size={12} className="text-white" /> : <Upload size={12} className="text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">Permis de navigation</p>
                    <p className="text-[10px] text-gray-400">{client.permis.type || 'Non renseigné'}{client.permis.numero ? ` · ${client.permis.numero}` : ''}</p>
                  </div>
                </div>
                <button className="text-xs text-navy-600 hover:underline" onClick={() => setUploadTarget('permis')}>
                  {docs.permis ? 'Remplacer' : 'Uploader'}
                </button>
              </div>
            </div>

            <SectionLabel>Historique des locations</SectionLabel>
            {bookings.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-400">Aucune location enregistrée.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setHistoryBooking(b)}>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{b.boatName}</p>
                      <p className="text-[10px] text-gray-400">{b.start} → {b.end}</p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[80] p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="font-display text-white text-base font-bold">
                {uploadTarget === 'pieceId' ? "Pièce d'identité" : 'Permis de navigation'}
              </h2>
              <button onClick={() => setUploadTarget(null)} className="text-navy-100 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-3">{client.prenom} {client.nom}</p>
              <FileUpload
                onUpload={() => {
                  setDocs(d => ({ ...d, [uploadTarget]: true }))
                  setTimeout(() => setUploadTarget(null), 600)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCautionEdit && (
        <CautionEditModal
          caution={caution}
          onClose={() => setShowCautionEdit(false)}
          onSave={updated => setCaution(updated)}
        />
      )}

      {historyBooking && <BookingHistoryDetail booking={historyBooking} onClose={() => setHistoryBooking(null)} />}
    </div>
  )
}

function NewClientModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    nom: '', prenom: '', tel: '', email: '', naissance: '', nationalite: 'Française',
    pieceIdType: 'CNI', pieceIdNum: '',
    permisType: '', permisNum: '',
    cautionMontant: '1500', cautionMode: 'CB',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: '' })) }

  function validate() {
    const e = {}
    if (!form.nom.trim()) e.nom = 'Requis'
    if (!form.prenom.trim()) e.prenom = 'Requis'
    if (!form.tel.trim()) e.tel = 'Requis'
    setErrors(e)
    if (!Object.keys(e).length) {
      onAdd({
        id: 'cli-new-' + Date.now(),
        nom: form.nom, prenom: form.prenom, tel: form.tel, email: form.email,
        naissance: form.naissance, nationalite: form.nationalite,
        pieceId: { numero: form.pieceIdNum, type: form.pieceIdType, uploaded: false },
        permis: { numero: form.permisNum, type: form.permisType, uploaded: false },
        caution: { montant: parseInt(form.cautionMontant) || 0, mode: form.cautionMode, statut: 'en_attente' },
        notes: form.notes, locations: [],
      })
      onClose()
    }
  }

  const inp = (k) => `w-full text-sm px-3 py-2 border rounded-lg bg-white transition-colors ${errors[k] ? 'border-danger-400 bg-danger-50' : 'border-gray-200 focus:border-navy-600 focus:outline-none'}`

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-navy-900 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="font-display text-white text-base font-bold">Nouveau client</h2>
          <button onClick={onClose} className="text-navy-100 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <SectionLabel>Informations personnelles</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Nom <span className="text-danger-600">*</span></p>
              <input className={inp('nom')} placeholder="Dupont" value={form.nom} onChange={e => set('nom', e.target.value)} />
              {errors.nom && <p className="text-xs text-danger-600 mt-1">{errors.nom}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Prénom <span className="text-danger-600">*</span></p>
              <input className={inp('prenom')} placeholder="Jean" value={form.prenom} onChange={e => set('prenom', e.target.value)} />
              {errors.prenom && <p className="text-xs text-danger-600 mt-1">{errors.prenom}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Téléphone <span className="text-danger-600">*</span></p>
              <input className={inp('tel')} placeholder="06 12 34 56 78" value={form.tel} onChange={e => set('tel', e.target.value)} />
              {errors.tel && <p className="text-xs text-danger-600 mt-1">{errors.tel}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <input className={inp('email')} placeholder="jean@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Date de naissance</p>
              <input type="date" className={inp('naissance')} value={form.naissance} onChange={e => set('naissance', e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Nationalité</p>
              <input className={inp('nationalite')} value={form.nationalite} onChange={e => set('nationalite', e.target.value)} />
            </div>
          </div>

          <SectionLabel>Pièce d'identité</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <select className={inp('pieceIdType')} value={form.pieceIdType} onChange={e => set('pieceIdType', e.target.value)}>
                <option>CNI</option><option>Passeport</option><option>Titre de séjour</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Numéro</p>
              <input className={inp('pieceIdNum')} placeholder="FR123456789" value={form.pieceIdNum} onChange={e => set('pieceIdNum', e.target.value)} />
            </div>
          </div>

          <SectionLabel>Permis de navigation</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Type de permis</p>
              <select className={inp('permisType')} value={form.permisType} onChange={e => set('permisType', e.target.value)}>
                <option value="">-- Sélectionner --</option>
                {PERMIS_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Numéro</p>
              <input className={inp('permisNum')} placeholder="PM-13-2020-001" value={form.permisNum} onChange={e => set('permisNum', e.target.value)} />
            </div>
          </div>

          <SectionLabel>Caution</SectionLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Montant (€)</p>
              <input type="number" className={inp('cautionMontant')} value={form.cautionMontant} onChange={e => set('cautionMontant', e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Mode de paiement</p>
              <select className={inp('cautionMode')} value={form.cautionMode} onChange={e => set('cautionMode', e.target.value)}>
                {CAUTION_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <SectionLabel>Notes internes</SectionLabel>
          <textarea
            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:border-navy-600"
            rows={2}
            placeholder="Observations, habitudes du client..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary flex-1 justify-center" onClick={validate}>
            <Check size={14} /> Créer le client
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Clients() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [extraClients, setExtraClients] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  const allClients = [...CLIENTS, ...extraClients]

  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId) {
      const match = allClients.find(c => c.id === clientId)
      if (match) setSelected(match)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = allClients.filter(c =>
    `${c.prenom} ${c.nom} ${c.tel} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const alerts = allClients.flatMap(c => {
    const a = getClientAlerts(c, BOOKINGS)
    return a.map(alert => ({ ...alert, client: c }))
  }).filter(a => a.type === 'danger')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="topbar">
        <div>
          <h1 className="font-display text-base font-bold">Clients</h1>
          <p className="text-xs text-gray-400">{allClients.length} clients · {alerts.length} alerte{alerts.length > 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={14} /> Nouveau client</button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, email..."
            className="w-full text-sm pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-navy-600"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {alerts.length > 0 && (
          <div className="mb-4">
            <SectionLabel>Documents manquants</SectionLabel>
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 bg-danger-50 border border-danger-100 rounded-lg p-2.5 mb-2 text-xs text-danger-800 cursor-pointer hover:bg-danger-100 transition-colors" onClick={() => setSelected(a.client)}>
                <AlertTriangle size={12} className="flex-shrink-0" />
                <strong>{a.client.prenom} {a.client.nom}</strong> — {a.msg}
                <span className="ml-auto text-[10px] underline">Voir →</span>
              </div>
            ))}
          </div>
        )}

        <SectionLabel>Base clients ({filtered.length})</SectionLabel>
        <div className="flex flex-col gap-2">
          {filtered.map(c => <ClientCard key={c.id} client={c} onSelect={setSelected} />)}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Aucun client trouvé pour "{search}"</div>
          )}
        </div>
      </div>

      {selected && <ClientDetail client={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewClientModal onClose={() => setShowNew(false)} onAdd={c => setExtraClients(prev => [...prev, c])} />}
    </div>
  )
}
