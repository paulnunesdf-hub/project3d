/** Stands in for the 3D viewport when the browser can't give us WebGL. Only the
 *  canvas area is replaced — the sidebar, parts list and cutlist are plain DOM
 *  and keep working on an already-saved design, so a project stays readable even
 *  though nothing can be modelled. */
export function WebGLUnavailable() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-bg p-6"
      role="alert"
    >
      <div className="max-w-md rounded border border-edge bg-surface px-5 py-4">
        <h2 className="m-0 mb-2 text-base font-semibold text-ink">O 3D não abriu neste computador</h2>
        <p className="text-small m-0 mb-3 leading-relaxed text-ink-dim">
          Panelizer draws its workspace with WebGL and this browser isn't providing it. The parts
          list, materials and cutlist still work on a saved design, but panels can't be modelled
          without it.
        </p>
        <ul className="text-small m-0 list-disc space-y-1 pl-5 leading-relaxed text-ink-dim">
          <li>Ligue a aceleração por hardware nas configurações do navegador.</li>
          <li>Atualize o navegador ou tente outro.</li>
          <li>
            Check <Code>chrome://gpu</Code> (or <Code>about:support</Code> in Firefox) for a
            blocklisted graphics driver.
          </li>
        </ul>
      </div>
    </div>
  )
}

/** Inline literal for a browser URL the reader is meant to type. */
function Code({ children }: { children: string }) {
  return <code className="text-micro rounded-xs bg-surface-3 px-1 py-px text-ink">{children}</code>
}
