import { parse, serialize, type Design } from './persistence'

/**
 * Sharing a design as a link.
 *
 * The app is a static site with no backend, so the design travels *inside* the
 * URL rather than being uploaded anywhere. It is gzipped (via the platform's
 * own CompressionStream — no dependency) and base64url-encoded into the hash,
 * which browsers never send to the server. A link is therefore entirely
 * self-contained and private to whoever holds it.
 */

/** Hash prefix marking a shared design, so other fragments are ignored. */
const HASH_PREFIX = '#design='

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  // `bytes.buffer` rather than the view: TS types BlobPart as ArrayBuffer, and
  // a Uint8Array over a SharedArrayBuffer wouldn't satisfy it.
  const blob = new Blob([bytes.buffer as ArrayBuffer])
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/** Base64url: the plain alphabet needs escaping in a URL, this one doesn't. */
function toBase64Url(bytes: Uint8Array): string {
  // Chunked rather than spread — a whole design can exceed the argument limit
  // of String.fromCharCode and blow the stack.
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array {
  const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** A full, self-contained link to this design. */
export async function designToLink(design: Design): Promise<string> {
  const token = toBase64Url(await gzip(JSON.stringify(serialize(design))))
  const { origin, pathname } = window.location
  return `${origin}${pathname}${HASH_PREFIX}${token}`
}

/** The shared design in the current URL, or null if there isn't one. Throws if
 *  the link is present but corrupt, so the caller can say so. */
export function sharedToken(): string | null {
  const hash = window.location.hash
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null
}

export async function linkToDesign(token: string): Promise<Design> {
  return parse(await gunzip(fromBase64Url(token)))
}

/** Drop the design out of the address bar once it's been dealt with, so a
 *  reload doesn't offer to import it all over again. */
export function clearSharedToken(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
