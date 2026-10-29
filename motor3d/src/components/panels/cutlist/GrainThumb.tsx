import type { Grain } from '../../../types/panel'
import { GRAIN_LABEL } from './grainCycle'

const BOX_W = 40
const BOX_H = 26
const PAD = 3

/**
 * Combined preview + toggle for a part's grain. The rectangle turns to show how
 * the part actually sits on the sheet (a `width`-grain part rotates 90°). Grain
 * always lies along the sheet length once placed, so the overlaid glyph is ↔ for
 * any constrained part and ↻ for a free one — the rect's rotation is what tells
 * length from width grain apart. Click cycles width → length → free.
 */
export function GrainThumb({
  length,
  width,
  grain,
  mixed = false,
  onClick,
  tipProps,
}: {
  length: number
  width: number
  grain: Grain
  /** The parts under this row don't agree — show that rather than picking one
   *  of them to display, which would misreport the others. */
  mixed?: boolean
  onClick: () => void
  tipProps: (text: string) => object
}) {
  const rotated = grain === 'width' // grain edge must lie along the sheet length
  const footW = rotated ? width : length // horizontal extent on the sheet
  const footH = rotated ? length : width

  const scale = Math.min((BOX_W - 2 * PAD) / footW, (BOX_H - 2 * PAD) / footH)
  const w = Math.max(4, footW * scale)
  const h = Math.max(4, footH * scale)

  const glyph = mixed ? '≠' : grain === 'none' ? '↻' : '↔'
  const title = mixed
    ? 'Mixed orientations · click to match them up, or expand to set each'
    : `${GRAIN_LABEL[grain]} · click to change`

  return (
    <svg
      className={
        mixed
          ? 'cursor-pointer fill-ink-faint/50 outline-none hover:fill-ink-dim'
          : 'cursor-pointer fill-ink-dim/70 outline-none hover:fill-ink'
      }
      width={BOX_W}
      height={BOX_H}
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      {...tipProps(title)}
    >
      <rect x={(BOX_W - w) / 2} y={(BOX_H - h) / 2} width={w} height={h} rx={1.5} />
      <text
        x={BOX_W / 2}
        y={BOX_H / 2 + 3.5}
        textAnchor="middle"
        className="fill-bg text-[11px] font-bold"
      >
        {glyph}
      </text>
    </svg>
  )
}
