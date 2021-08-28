/**
 * Natural language branch uses NLU result to match on intent, entities and/or
 * sentiment of optional score threshold. NLU must be trained to provide intent.
 */
export class NLUBranch extends Branch {
  processKey: ProcessKeys = 'understand'
  match: NLUResultsRaw | undefined

  /** Create natural language branch for NLU matching. */
  constructor (
    public criteria: NLUCriteria,
    callback: action,
    options?: IBranch
  ) {
    super(callback, options)
  }

  /** Match on message's NLU attributes */
  async matcher (msg: TextMessage) {
    if (!msg.nlu) {
      logger.error(`[branch] NLU attempted matching without NLU, ID ${this.id}`)
      return undefined
    }
    const match = msg.nlu.matchAllCriteria(this.criteria)
    if (match) {
      logger.debug(`[branch] NLU matched language branch ID ${this.id}`)
      return match
    }
    return undefined
  }
}
