/** Custom branch using unique matching function */
export class CustomBranch extends Branch {
  /** Accepts custom function to test message */
  constructor (
    public customMatcher: IMatcher,
    action: action,
    options?: IBranch
  ) {
    super(action, options)
  }

  /** Standard matcher method routes to custom matching function */
  async matcher (msg: Message) {
    const match = await Promise.resolve(this.customMatcher(msg))
    if (match) {
      logger.debug(`[branch] message "${msg}" matched custom branch ID ${this.id}`)
    }
    return match
  }
}
