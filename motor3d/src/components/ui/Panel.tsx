import type { ReactNode } from 'react'
import { cx } from './cx'

/**
 * A titled group of controls in a sidebar, with an optional action in the
 * header (a "+ Add" button, typically). Used by every settings block.
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cx('border-b border-edge px-3 py-3 last:border-b-0', className)}>
      <header className="mb-2 flex h-6 items-center justify-between gap-2">
        <h3 className="label-micro">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}

/** Muted explanatory text — empty states and inline guidance. */
export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('text-small m-0 py-0.5 leading-relaxed text-ink-faint', className)}>{children}</p>
  )
}

/** A material's colour chip, shown beside its name everywhere it appears. */
export function Swatch({ color }: { color?: string }) {
  return (
    <span
      data-swatch
      className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-black/40 ring-inset"
      style={{ background: color }}
    />
  )
}
