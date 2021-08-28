/** Branch to match on any CatchAll type */
export class CatchAllBranch extends Branch {
  processKey: ProcessKeys = 'act'

  /** Accepts only super args, matcher is fixed */
  constructor (action: action, options?: IBranch) {
    super(action, options)
  }

  /** Matching function looks for any CatchAll */
  async matcher (msg: Message) {
    if (msg instanceof CatchAllMessage) {
      logger.debug(`[branch] message "${msg}" matched catch all ID ${this.id}`)
      return msg
    }
    return undefined
  }
}
