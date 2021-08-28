import { State } from '../state/class'

/** State callback interface, usually for branch if the message matched. */
export interface ICallback {
  (b: State): any
}

/**
 * A collection of attributes for setting up branches, paths, dialogues, scenes
 * and directors. All the related controllers for what causes a bit to execute
 * and what happens next.
 */
export interface IBitOptions {
  /** String/s to send when doing bit (must have this or callback) */
  send?: string | string[],
  /** To send if response unmatched by branch */
  catch?: string,
  /** Function to call when executing bit (after any defined sends) */
  callback?: ICallback,
  /** Function to call when response unmatched by branch */
  catchCallback?: ICallback,
  /** Regex or string converted to regex for branch to trigger bit */
  condition?: RegExp | string,
  /** Key for language processed intent to match for execution */
  intent?: string,
  /** Key/s (strings) for consecutive bits (implicitly creates scene) */
  next?: string | string[],
  /** Key/val options for scene and/or dialogue config */
  options?: { [key: string]: any },
  [key: string]: any
}

/**
 * A single interaction between user and bot.
 * Could be a command to trigger a callback, a request for data or just a
 * connecting line of dialogue.
 */
export class Bit {
  constructor (public id: string, public options: IBitOptions) {}

  /** Execute with current state (e.g. send replies and/or call callbacks). */
  async run (b: State) {
    if (this.options.callback) await Promise.resolve(this.options.callback(b))
  }
}
