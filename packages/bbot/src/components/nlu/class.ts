import { INLUResult, INLUQuery } from './interface'

/** Array of Natural Language Understanding results */
export class NLU extends Array<INLUResult> {
  /**
   * Helper to see if a result has the properties of a matching element.
   * Check for matching subset (id/name) ignoring score unless only score given.
   * @param index Array index in NLU result set
   * @param query NLU criteria or result subset to match on (ignores score)
   */
  indexIncludes (index: number, query: INLUQuery) {
    if (!Object.keys(query).some((key) => {
      return (['id', 'name', 'score'].includes(key))
    })) throw new Error('[nlu] NLUResult matching requires ID, name or score')
    if (this[index] === void 0) return undefined
    const { id, name, score } = query
    const result = this[index]
    let found = true
    if (id || name) {
      if (id && result.id !== id) found = false
      if (name && result.name !== name) found = false
    } else if (result.score !== score) found = false
    if (found) return result
    return undefined
  }

  /**
   * Sort results by their score (DESC). NLUResults that don't have a score will
   * come before those that do (assuming that no score relates full confidence).
   * Order remains unchanged for whole sequences of results without score.
   */
  sortByScore () {
    this.sort((a, b) => {
      if (typeof a.score !== 'undefined' && typeof b.score !== 'undefined') {
        return b.score - a.score
      }
      if (typeof a.score !== 'undefined' || typeof b.score !== 'undefined') {
        return (a.score) ? 1 : -1
      }
      return 0
    })
  }

  /**
   * Match NLU results by optional operator. Default uses score as threshold,
   * matching if greater than or equal to (`gte`) comparison score. If no score
   * given, it matches if the result `has` (includes) the given id and/or name.
   * When comparing score, the array is first filtered against other queries.
   */
  match (query: INLUQuery) {
    let { score, operator } = query
    if (!operator) operator = (typeof score === 'undefined') ? 'in' : 'gte'
    let matching: INLUResult | undefined
    let matched: INLUResult[]
    this.sortByScore()
    if (
      ['eq', 'gte', 'gt', 'lt', 'lte'].includes(operator) &&
      typeof score === 'undefined'
    ) throw new Error('[nlu] NLUResult cannot match score without score query')
    if (
      ['eq', 'gte', 'gt', 'lt', 'lte'].includes(operator) &&
      Object.keys(query).some((key) => !['score', 'operator'].includes(key))
    ) matched = this.filter((_, index) => this.indexIncludes(index, query))
    else matched = Array.from(this)
    if (!matched.length) return undefined
    switch (operator) {
      case 'in':
        matched = this.filter((_, index) => this.indexIncludes(index, query))
        return matched.length ? matched : undefined
      case 'is':
        if (this.length === 1) matching = this.indexIncludes(0, query)
        return matching ? [matching] : undefined
      case 'max':
        matching = this.indexIncludes(0, query)
        return matching ? [matching] : undefined
      case 'min':
        matching = this.indexIncludes(this.length - 1, query)
        return matching ? [matching] : undefined
      case 'eq':
        matched = matched.filter((item) => {
          return (typeof item.score !== 'undefined' && item.score === 0)
        })
        return (matched.length) ? matched : undefined
      case 'gte':
        matched = matched.filter((item) => {
          return (typeof item.score !== 'undefined' && item.score >= score!)
        })
        return (matched.length) ? matched : undefined
      case 'gt':
        matched = matched.filter((item) => {
          return (typeof item.score !== 'undefined' && item.score > score!)
        })
        return (matched.length) ? matched : undefined
      case 'lt':
        matched = matched.filter((item) => {
          return (typeof item.score !== 'undefined' && item.score < score!)
        })
        return (matched.length) ? matched : undefined
      case 'lte':
        matched = matched.filter((item) => {
          return (typeof item.score !== 'undefined' && item.score <= score!)
        })
        return (matched.length) ? matched : undefined
    }
    return
  }

  /** Helper to push a set of result as arguments (returns result instance) */
  add (...results: INLUResult[]) {
    for (let result of results) this.push(result)
    return this
  }
}
