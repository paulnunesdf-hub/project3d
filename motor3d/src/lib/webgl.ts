/**
 * Whether this browser will give us a WebGL context.
 *
 * The 3D viewport is the whole point of the app, so a browser that can't render
 * it should say why instead of leaving a blank rectangle. `<Canvas fallback>`
 * does not cover this case: that prop is the `<canvas>` element's alt content,
 * which browsers show only when the *element itself* is unsupported. A browser
 * with canvas support but WebGL disabled, blocklisted, or running without a GPU
 * renders an empty canvas and three.js throws while building the renderer.
 *
 * Probed once and cached. Contexts are not free and browsers cap how many can be
 * live at a time, so this must not run per render.
 */
let cached: boolean | null = null

export function hasWebGL(): boolean {
  cached ??= probe()
  return cached
}

function probe(): boolean {
  // Wrapped whole: some browsers throw from getContext rather than returning
  // null when WebGL is switched off.
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    // Hand the context straight back rather than waiting for GC — the real
    // viewport needs one and the per-browser budget is small.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
