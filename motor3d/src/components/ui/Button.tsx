import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Variant = 'default' | 'primary' | 'ghost' | 'danger' | 'dangerGhost'
type Size = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded border font-medium whitespace-nowrap ' +
  'cursor-pointer transition-[background-color,border-color,color,box-shadow] duration-100 ' +
  'active:translate-y-px disabled:opacity-35 disabled:cursor-not-allowed disabled:active:translate-y-0 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'

const VARIANTS: Record<Variant, string> = {
  // A subtle top highlight reads as a raised key — the standard tool-button look
  // without a heavy gradient.
  default:
    'bg-surface-2 border-edge-strong text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] ' +
    'enabled:hover:bg-surface-3 enabled:hover:border-edge-strong',
  primary:
    'bg-accent border-accent text-white shadow-[0_1px_2px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_255_255/0.15)] ' +
    'enabled:hover:bg-accent-hover enabled:hover:border-accent-hover',
  // Ghost carries no chrome until hovered — for icon buttons sitting inside
  // dense rows, where a full button outline would be visual noise.
  ghost:
    'bg-transparent border-transparent text-ink-dim enabled:hover:bg-surface-2 enabled:hover:text-ink',
  // A destructive action that sits next to a normal one (Delete beside
  // Duplicate) needs the same chrome as its neighbour, or it reads as disabled
  // rather than as the dangerous option.
  danger:
    'bg-surface-2 border-edge-strong text-danger shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] ' +
    'enabled:hover:bg-danger enabled:hover:border-danger enabled:hover:text-white',
  // The borderless flavour, for a bare ✕ inside a dense row. Rests at the same
  // weight as any other secondary icon so it never looks unavailable; the red
  // only appears once you're on it.
  dangerGhost:
    'bg-transparent border-transparent text-ink-dim ' +
    'enabled:hover:bg-danger/15 enabled:hover:text-danger',
}

const SIZES: Record<Size, string> = {
  sm: 'text-micro px-2.5 py-1',
  md: 'text-small px-3 py-1.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Render as a square icon-only button (equal padding, no text metrics). */
  icon?: boolean
  children?: ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  icon = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], icon ? 'p-1' : SIZES[size], className)}
      {...rest}
    />
  )
}
