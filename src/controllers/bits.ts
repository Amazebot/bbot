import logger from './logger'
import { State } from '../components/state'
import { Bit, IBit } from '../components/bit'

export class BitController {
  /** Keep all created bits, for getting by their ID as key. */
  current: { [id: string]: Bit } = {}

  /** Create a bit instance. */
  create = (atts: IBit) => new Bit(atts)

  /** Add new bit to collection, returning its ID. */
  setup (atts: IBit) {
    const bit = this.create(atts)
    this.current[bit.id] = bit
    return bit.id
  }

  /** Execute a bit using its ID, providing current bot state. */
  run (id: string, b: State) {
    if (!this.current[id]) {
      logger.error('[bits] failed to run bit with unknown ID')
      return
    }
    return this.current[id].run(b)
  }
}

export const bits = new BitController()

export default bits
