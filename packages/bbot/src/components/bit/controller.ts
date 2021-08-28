/**
 * Define nodes of interaction in simple executable schemas.
 * @module components/bit
 */

import { logger, counter } from '../../util'
import { Bit, IBitOptions } from './class'
import { State } from '../state/class'

export class BitController {
  /** Keep all created bits, for getting by their ID as key. */
  bits: { [id: string]: Bit } = {}

  /**
   * Define a `condition` or `intent` that executes the bit.
   *
   * A subsequent bit can even lead back to its own parent or any other bit,
   * creating a mesh of possible conversational pathways.
   *
   * A bit without a `condition` or `intent` can still be executed by calling
   * `doBit` with its `id`. This could be useful for defining integration logic
   * that does something outside chat, but can be triggered by chat scripts.
   */
  create = (options: IBitOptions) => {
    if (
      !options.strings &&
      !options.payload &&
      !options.callback
    ) {
      logger.warn(`[bits] won't work without a strings, payload or callback attribute.`)
    }
    const bit = new Bit(counter('bit'), options)
    this.bits[bit.id] = bit
    return bit.id
  }

  /** Execute a bit using its ID, providing current bot state. */
  run (id: string, b: State) {
    if (!this.bits[id]) {
      logger.error('[bits] failed to run bit with unknown ID')
      return
    }
    return this.bits[id].run(b)
  }
}
