import { useRef } from 'react'
import type { Panel } from '../../types/panel'
import { useDesignStore, type Tool } from '../../store/designStore'
import { downloadDesign, parse } from '../../lib/persistence'
import { defaultThinThickness } from '../../lib/panel'
import { Menu, MenuItem, MenuList } from '../ui/Menu'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { useConfirm } from '../ui/useConfirm'
import { ponte } from '../../ambiente/store'
import { ToolHint } from '../layout/ToolHint'

/** Quick-add presets so a carcass can be roughed out in a few clicks. Each sets
 *  the orientation and a typical size; everything stays editable afterwards.
 *  Thickness is left to the document-unit default, except thin parts (a back),
 *  which are flagged so they get the thin-stock default. (A shelf is just a
 *  horizontal panel, i.e. the same as top/bottom.) */
const ADD_PRESETS: { label: string; preset: Partial<Panel>; thin?: boolean }[] = [
  { label: 'Lateral', preset: { name: 'Lateral', normal: 'x', length: 580, width: 720 } },
  { label: 'Base / Tampo / Prateleira', preset: { name: 'Base', normal: 'y', length: 600, width: 580 } },
  { label: 'Fundo', preset: { name: 'Fundo', normal: 'z', length: 600, width: 720 }, thin: true },
  { label: 'Porta', preset: { name: 'Porta', normal: 'z', length: 400, width: 716 } },
  { label: 'Divisória', preset: { name: 'Divisória', normal: 'x', length: 560, width: 684 } },
  { label: 'Tampo de pia', preset: { name: 'Tampo', normal: 'y', length: 1800, width: 600, thickness: 30 } },
]

/** Toolbar buckets. A bucket with several modes opens a dropdown; a bucket with
 *  a single mode is just a toggle button. */
const TOOL_SECTIONS: { label: string; tools: { tool: Tool; label: string }[] }[] = [
  {
    label: 'Mover',
    tools: [
      { tool: 'move', label: 'Livre' },
      { tool: 'move-snap', label: 'Por ponto' },
    ],
  },
  { label: 'Redimensionar', tools: [{ tool: 'resize', label: 'Redimensionar' }] },
  { label: 'Medir', tools: [{ tool: 'measure', label: 'Medir canto a canto' }] },
]

const DIVIDER = <div className="my-1 border-t border-edge" />

export function Toolbar() {
  const panels = useDesignStore((s) => s.panels)
  const materials = useDesignStore((s) => s.materials)
  const stocks = useDesignStore((s) => s.stocks)
  const unit = useDesignStore((s) => s.unit)
  const kerf = useDesignStore((s) => s.kerf)
  const margin = useDesignStore((s) => s.margin)
  const precision = useDesignStore((s) => s.precision)
  const tool = useDesignStore((s) => s.tool)
  const setTool = useDesignStore((s) => s.setTool)
  const addPanel = useDesignStore((s) => s.addPanel)
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const fixPrecision = useDesignStore((s) => s.fixPrecision)
  const clear = useDesignStore((s) => s.clear)
  const fileInput = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const empty = panels.length === 0

  const handleImport = async (file: File) => {
    try {
      loadDesign(parse(await file.text()))
    } catch (error) {
      await confirm({
        title: 'Não consegui importar esse arquivo',
        body: error instanceof Error ? error.message : 'Não consegui ler esse arquivo.',
        confirmLabel: 'OK',
        dismissOnly: true,
      })
    }
  }

  return (
    <>
      {/* Spacing is per-cluster, not one uniform gap: separate clusters need
          room between them, but the members of a cluster belong together and
          look adrift if given the same. */}
      <header className="flex h-13 shrink-0 items-center border-b border-edge bg-surface px-4 print:hidden">
        <span className="mr-3 text-xs font-semibold tracking-wide text-ink-dim uppercase">Módulos</span>

        <Menu label="+ Peça">
          {(close) => (
            <MenuList>
              {ADD_PRESETS.map(({ label, preset, thin }) => (
                <MenuItem
                  key={label}
                  onClick={() => {
                    addPanel(thin ? { ...preset, thickness: defaultThinThickness(unit) } : preset)
                    close()
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </MenuList>
          )}
        </Menu>

        <div
          className="ml-6 flex items-center gap-2 rounded-md border border-edge bg-bg/60 p-1.5"
          role="group"
          aria-label="Ferramentas"
        >
          {TOOL_SECTIONS.map((section) => {
            const active = section.tools.find((t) => t.tool === tool)

            // Single-mode bucket: a plain toggle button.
            if (section.tools.length === 1) {
              const { tool: t, label } = section.tools[0]
              return (
                <Button
                  key={section.label}
                  variant={tool === t ? 'primary' : 'ghost'}
                  onClick={() => setTool(t)}
                >
                  {label}
                </Button>
              )
            }

            // Multi-mode bucket: a dropdown showing the active sub-mode. Wears
            // the same `primary` fill as a lit single-mode button, so "this is
            // the active tool" reads identically across the whole group.
            return (
              <Menu
                key={section.label}
                ariaLabel={section.label}
                variant={active ? 'primary' : 'ghost'}
                label={
                  <span className="flex items-center gap-1.5">
                    {section.label}
                    {active && (
                      <span className="text-micro rounded-xs bg-white/20 px-1 py-px text-white">
                        {active.label}
                      </span>
                    )}
                  </span>
                }
              >
                {(close) => (
                  <MenuList>
                    {section.tools.map(({ tool: t, label }) => (
                      <MenuItem
                        key={t}
                        onClick={() => {
                          setTool(t)
                          close()
                        }}
                      >
                        <span className={cx(tool === t && 'text-accent')}>{label}</span>
                      </MenuItem>
                    ))}
                  </MenuList>
                )}
              </Menu>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Cutlist and the document menu are one cluster — the divider marks
            them as different kinds of control without pushing them apart. */}
        <div className="flex items-center gap-2">
          <Button variant="primary" disabled={empty} onClick={() => ponte().enviarPecas?.(panels.filter((p) => !p.excludeFromCutlist).map((p) => ({ nome: p.name, L: Math.max(p.length, p.width), W: Math.min(p.length, p.width), esp: p.thickness, mat: materials.find((m) => m.id === p.materialId)?.name || '' })))}>
            Enviar peças ao projeto
          </Button>

          <span className="h-6 w-px bg-edge" />

          <Menu label="☰" ariaLabel="Menu dos módulos" align="right" variant="ghost">
          {(close) => (
            <MenuList>
              <MenuItem
                disabled={empty}
                onClick={() => {
                  downloadDesign({ panels, materials, stocks, unit, precision, kerf, margin }, 'modulos.panelizer.json')
                  close()
                }}
              >
                Exportar módulos…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  fileInput.current?.click()
                  close()
                }}
              >
                Importar módulos…
              </MenuItem>

              {DIVIDER}

              <MenuItem
                disabled={empty}
                onClick={() => {
                  fixPrecision()
                  close()
                }}
              >
                Corrigir precisão (fechar frestas)
              </MenuItem>

              {DIVIDER}

              <MenuItem
                danger
                disabled={empty}
                onClick={async () => {
                  close()
                  if (!empty) {
                    const ok = await confirm({
                      title: 'Apagar todos os módulos?',
                      body: 'Todas as peças saem do ambiente. Dá para voltar com Ctrl+Z.',
                      confirmLabel: 'Apagar tudo',
                      destructive: true,
                    })
                    if (ok) clear()
                  }
                }}
              >
                Novo (apagar tudo)
              </MenuItem>
            </MenuList>
          )}
          </Menu>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
            e.target.value = '' // allow re-importing the same filename
          }}
        />
      </header>
      <ToolHint />
    </>
  )
}
