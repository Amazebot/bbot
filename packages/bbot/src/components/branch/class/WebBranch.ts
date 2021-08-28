/** Wild card object for validating any key/value data at path. */
export interface IServerBranchCriteria {
  [path: string]: any
}

/** Server branch matches data in a message received on the server. */
export class ServerBranch extends Branch {
  processKey: ProcessKeys = 'serve'
  match: any

  /** Create server branch for data matching. */
  constructor (
    public criteria: IServerBranchCriteria,
    callback: action,
    options?: IBranch
  ) {
    super(callback, options)
  }

  /**
   * Match on any exact or regex values at path of key in criteria.
   * Will also match on empty data if criteria is an empty object.
   */
  async matcher (msg: ServerMessage) {
    const match: { [path: string]: any } = {}
    if (
      Object.keys(this.criteria).length === 0 &&
      (
        typeof msg.data === 'undefined' ||
        Object.keys(msg.data).length === 0
      )
    ) {
      return match
    } else {
      if (!msg.data) {
        logger.error(`[branch] server branch attempted matching without data, ID ${this.id}`)
        return undefined
      }
    }
    for (let path in this.criteria) {
      const valueAtPath = path.split('.').reduce((pre, cur) => {
        return (typeof pre !== 'undefined') ? pre[cur] : undefined
      }, msg.data)
      if (
        this.criteria[path] instanceof RegExp &&
        this.criteria[path].exec(valueAtPath)
      ) match[path] = this.criteria[path].exec(valueAtPath)
      else if (
        this.criteria[path] === valueAtPath ||
        this.criteria[path].toString() === valueAtPath
      ) match[path] = valueAtPath
    }
    if (Object.keys(match).length) {
      logger.debug(`[branch] Data matched server branch ID ${this.id}`)
      return match
    }
    return undefined
  }
}
