import { counter } from '../utils/id'
import logger from '../controllers/logger'
import { State, ICallback } from './state'

/**
 * A collection of attributes for setting up branches, paths, dialogues, scenes
 * and directors. All the related controllers for what causes a bit to execute
 * and what happens next.
 */
export interface IBit {
  id?: string,
  send?: string | string[],
  catch?: string,
  callback?: ICallback,
  catchCallback?: ICallback,
  condition?: RegExp | string,
  intent?: string,
  next?: string | string[],
  options?: string,
  [key: string]: any
}

/**
 * A single interaction between user and bot.
 * Could be a command to trigger a callback, a request for data or just a
 * connecting line of dialogue.
 */
export class Bit implements IBit {
  /** For scene and/or dialogue, branch running the bit (required) */
  id: string
  /** String/s to send when doing bit (must have this or callback) */
  send?: string | string[]
  /** To send if response unmatched by branch */
  catch?: string
  /** Function to call when executing bit (after any defined sends) */
  callback?: ICallback
  /** Function to call when response unmatched by branch */
  catchCallback?: ICallback
  /** Regex or string converted to regex for branch to trigger bit */
  condition?: RegExp | string
  /** Key for language processed intent to match for execution */
  intent?: string
  /** Key/s (strings) for consecutive bits (implicitly creates scene) */
  next?: string | string[]
  /** Key/val options for scene and/or dialogue config */
  options?: string
  /** Index signature for looping through attributes */
  [key: string]: any

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
  constructor (atts: IBit) {
    this.id = (atts.id) ? atts.id : counter('bit')
    for (let key of Object.keys(atts)) this[key] = atts[key]
    if (!this.strings && !this.attach && !this.callback) {
      logger.warn(`[bits] won't work without a strings, attach or callback attribute.`)
    }
  }

  /** Execute with current state (e.g. send replies and/or call callbacks). */
  async run (b: State) {
    if (this.callback) await Promise.resolve(this.callback(b))
  }
}
