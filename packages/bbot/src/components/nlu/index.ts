/**
 * Represent and handle results from natural language platforms.
 * @module components/nlu
 */

import { NLUController } from './controller'

export function makeNLUController () {
  return new NLUController()
}
