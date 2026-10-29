import { MATERIAL_COLORS } from '../../lib/materials'
import { useDesignStore } from '../../store/designStore'
import { Menu } from '../ui/Menu'
import { Button } from '../ui/Button'
import { CONTROL } from '../ui/Field'
import { Section } from '../ui/Panel'
import { cx } from '../ui/cx'

/** Editor for the design's material list. A material is just a name and a
 *  colour; thickness is set per panel. Each material is one compact row:
 *  a colour-picker dropdown, the name, and a remove button. */
export function MaterialsPanel() {
  const materials = useDesignStore((s) => s.materials)
  const addMaterial = useDesignStore((s) => s.addMaterial)
  const updateMaterial = useDesignStore((s) => s.updateMaterial)
  const removeMaterial = useDesignStore((s) => s.removeMaterial)

  return (
    <Section
      title="Materiais"
      action={
        <Button size="sm" onClick={addMaterial}>
          + Novo
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5">
        {materials.map((m) => (
          <div className="flex items-center gap-1.5" key={m.id}>
            <Menu
              ariaLabel="Cor do material"
              label={
                <span
                  className="block size-4 rounded-xs border border-black/30"
                  style={{ background: m.color }}
                />
              }
            >
              {(close) => (
                <div className="grid grid-cols-4 gap-1 p-1">
                  {MATERIAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cx(
                        'size-6 cursor-pointer rounded-xs border-2',
                        m.color === c ? 'border-ink' : 'border-transparent hover:border-edge-strong',
                      )}
                      style={{ background: c }}
                      aria-label={c}
                      onClick={() => {
                        updateMaterial(m.id, { color: c })
                        close()
                      }}
                    />
                  ))}
                </div>
              )}
            </Menu>

            <input
              type="text"
              className={CONTROL}
              value={m.name}
              onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
            />

            <Button
              variant="dangerGhost"
              icon
              aria-label="Remover material"
              disabled={materials.length === 1}
              onClick={() => removeMaterial(m.id)}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
    </Section>
  )
}
