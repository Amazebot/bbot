import { ICallback, ProcessKeys } from '../interface'
import { Message } from '../../message/class'

/** Attributes for branch. */
export interface IBranchProps {
  [key: string]: any
  /** ID for logs and getting branch from controller. */
  id: string
  /** Action to take on matching input. */
  callback: ICallback
  /** Force matching on this branch regardless of other matched branches. */
  force?: boolean
}

/** Process message in state and decide whether to act on it. */
export abstract class Branch implements IBranchProps {
  [key: string]: any
  id: string
  callback: ICallback
  force: boolean = false
  /** The thought process collection the branch should be applied. */
  processKey: ProcessKeys = 'listen'
  /** The result of branch matcher on input. */
  match?: any
  /** Status of match. */
  matched?: boolean

  /** Create a Branch */
  constructor ({ id, callback, force }: IBranchProps) {
    this.id = id
    this.callback = callback
    if (force) this.force = force
  }

  /**
   * Determine if this branch should trigger the callback.
   * Note that the method must be async, custom matcher will be promise wrapped.
   * Abstract input has no enforced type, but resolved result MUST be truthy.
   */
  abstract matcher (input: any): Promise<any>

  /** Compare and capture match results for a given message. */
  async execute (message: Message) {
    this.match = await Promise.resolve(this.matcher(message))
    this.matched = (this.match) ? true : false
    return this.match
  }

  /**
   * Perform execute on message, only if unmatched or forcing rematch.
   * Return boolean instead of result.
   */
  async test (message: Message) {
    if (!this.matched || this.force) {
      await this.execute(message)
      return this.matched
    }
    return false
  }

  /** Get the branch type, allows filtering processing. */
  get type () {
    return this.constructor.name
  }
}
