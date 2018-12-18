import logger from './logger'
import * as state from '../components/state'
import * as bit from '../components/bit'

export class BitController {
  /** Keep all created bits, for getting by their ID as key. */
  current: { [id: string]: bit.Bit } = {}

  /** Create a bit instance. */
  create (options: bit.IOptions) {
    return new bit.Bit(options)
  }

  /** Add new bit to collection, returning its ID. */
  setup (options: bit.IOptions) {
    const bit = this.create(options)
    this.current[bit.id] = bit
    return bit.id
  }

  /** Execute a bit using its ID, providing current bot state. */
  run (id: string, b: state.State) {
    if (!this.current[id]) {
      logger.error('[bits] failed to run bit with unknown ID')
      return
    }
    return this.current[id].run(b)
  }
}

export const bits = new BitController()

export default bits
