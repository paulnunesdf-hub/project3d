import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { cx } from './cx'

/**
 * Shared input/select chrome, so a raw `<input>` and a `<select>` match.
 *
 * Controls sit *recessed* into the panel (darker than their surround) rather
 * than floating on it — in a dense tool that reads as "editable" without
 * needing a heavy border. Focus lifts the surface and adds a ring instead of
 * only tinting the border, which was easy to miss.
 */
export const CONTROL =
  'w-full rounded border border-edge bg-bg px-2 py-1 text-ink transition-colors ' +
  'placeholder:text-ink-faint hover:border-edge-strong ' +
  'focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/25 focus:outline-none ' +
  'disabled:opacity-40'

/** Measurement fields are compared down a column, so their values sit right. */
export const CONTROL_NUMERIC = `${CONTROL} text-right tabular-nums`

/**
 * A labelled form row: label on the left, control on the right, with an
 * optional trailing unit suffix. This is the layout every settings field in the
 * app uses, and it was previously hand-written in four places.
 */
export function Field({
  label,
  suffix,
  children,
  className,
}: {
  label: ReactNode
  suffix?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('group flex items-center gap-2 py-[3px]', className)}>
      {/* Fixed-width label column so every control in a panel lines up. */}
      <span className="text-small w-20 shrink-0 truncate text-ink-dim group-focus-within:text-ink">
        {label}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1">
        {children}
        {suffix && <span className="text-micro w-5 shrink-0 text-ink-faint">{suffix}</span>}
      </span>
    </label>
  )
}

/** A `<select>` wearing the shared control chrome, in a Field row. */
export function SelectField({
  label,
  className,
  children,
  ...rest
}: { label: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label}>
      <select className={cx(CONTROL, className)} {...rest}>
        {children}
      </select>
    </Field>
  )
}

/** A plain `<input>` wearing the shared control chrome, in a Field row. */
export function InputField({
  label,
  suffix,
  className,
  ...rest
}: { label: ReactNode; suffix?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} suffix={suffix}>
      <input className={cx(CONTROL, className)} {...rest} />
    </Field>
  )
}
