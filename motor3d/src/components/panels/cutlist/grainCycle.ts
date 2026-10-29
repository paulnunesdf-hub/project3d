import type { Grain } from '../../../types/panel'

/** Click order for the grain toggle: width → length → free → (loops back). */
const GRAIN_CYCLE: Grain[] = ['width', 'length', 'none']

export const nextGrain = (g: Grain): Grain =>
  GRAIN_CYCLE[(GRAIN_CYCLE.indexOf(g) + 1) % GRAIN_CYCLE.length]

export const GRAIN_LABEL: Record<Grain, string> = {
  width: 'Grain along width',
  length: 'Grain along length',
  none: 'Free orientation',
}
