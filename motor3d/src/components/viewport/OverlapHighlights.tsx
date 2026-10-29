import { useMemo } from 'react'
import { toMetres } from '../../lib/geometry'
import { overlapBoxes } from '../../lib/overlaps'
import { palette } from './palette'
import { useDesignStore } from '../../store/designStore'

/** Slightly grow each overlay so it pokes through the panels and doesn't
 *  z-fight with their faces (mm). */
const PAD = 1.5

/** Translucent markers wherever two panels share space. Purely a visual cue
 *  that a joint lives there — not an error. */
export function OverlapHighlights() {
  const panels = useDesignStore((s) => s.panels)
  const boxes = useMemo(() => overlapBoxes(panels), [panels])
  const paint = palette()

  return (
    <>
      {boxes.map((box, i) => (
        <mesh key={i} position={toMetres(box.center)}>
          <boxGeometry args={toMetres([box.size[0] + PAD, box.size[1] + PAD, box.size[2] + PAD])} />
          <meshStandardMaterial
            color={paint.overlap}
            emissive={paint.overlap}
            emissiveIntensity={0.4}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
