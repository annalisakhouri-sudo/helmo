import { clsx } from 'clsx'

export function Badge({ status, children }) {
  const classes = {
    ok:     'pill-ok',
    warn:   'pill-warn',
    danger: 'pill-danger',
    blue:   'pill-blue',
    skipper:'pill-skipper',
    draps:  'pill-draps',
  }
  return <span className={classes[status] || 'pill-blue'}>{children}</span>
}

export function Avatar({ initials, color = 'bg-navy-100 text-navy-800', size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }
  return (
    <div className={clsx('avatar', color, sizes[size])}>
      {initials}
    </div>
  )
}

export function Card({ children, className, onClick }) {
  return (
    <div className={clsx('card', onClick && 'cursor-pointer hover:shadow-sm transition-shadow', className)} onClick={onClick}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }) {
  return <p className="section-label">{children}</p>
}

export function StatCard({ label, value, sub, variant }) {
  const colors = { ok: 'text-teal-600', warn: 'text-danger-600', default: 'text-navy-600' }
  return (
    <div className="card">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={clsx('font-display text-2xl font-bold', colors[variant] || colors.default)}>{value}</p>
      {sub && <p className={clsx('text-xs mt-0.5', variant ? colors[variant] : 'text-gray-400')}>{sub}</p>}
    </div>
  )
}

export function AlertBanner({ variant = 'danger', icon, children, action, onAction }) {
  const styles = {
    danger: 'alert-danger',
    warn: 'alert-warn',
  }
  return (
    <div className={styles[variant]} onClick={onAction}>
      {icon && <span className={variant === 'danger' ? 'text-danger-600' : 'text-amber-600'}>{icon}</span>}
      <div className="flex-1 text-sm">{children}</div>
      {action && <span className={clsx('text-xs whitespace-nowrap', variant === 'danger' ? 'text-danger-600' : 'text-amber-600')}>{action} →</span>}
    </div>
  )
}

export function DocStatusDot({ status }) {
  const colors = { ok: 'bg-teal-400', warn: 'bg-amber-200', danger: 'bg-danger-400' }
  return <span className={clsx('inline-block w-2 h-2 rounded-full', colors[status] || 'bg-gray-300')} />
}

export function ProgressBar({ pct, variant = 'ok' }) {
  const colors = { ok: 'bg-teal-400', warn: 'bg-amber-200', danger: 'bg-danger-400' }
  return (
    <div className="bg-gray-100 rounded-full h-1.5 w-full">
      <div className={clsx('h-1.5 rounded-full transition-all', colors[variant])} style={{ width: `${pct}%` }} />
    </div>
  )
}
