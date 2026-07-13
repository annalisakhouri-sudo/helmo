import {
  Anchor, Shirt, Fuel, Waves, Sailboat, Sun, Glasses,
  ShieldCheck, Wifi, SprayCan, Wrench, Camera, Music, Coffee, Umbrella,
} from 'lucide-react'

export const ICON_MAP = {
  Anchor, Shirt, Fuel, Waves, Sailboat, Sun, Glasses,
  ShieldCheck, Wifi, SprayCan, Wrench, Camera, Music, Coffee, Umbrella,
}

export const ICON_NAMES = Object.keys(ICON_MAP)

export default function OptionIcon({ name, size = 16, className = '', style = {} }) {
  const Icon = ICON_MAP[name] || Anchor
  return <Icon size={size} className={className} style={style} aria-hidden="true" />
}
