/**
 * Interface for Natural Language Understanding result attributes.
 * @param id    The primary text code for a result
 * @param name  A display name equivalent for the ID
 * @param score The positivity or confidence rating of the result
 */
export interface INLUResult {
  id?: string
  name?: string
  score?: number
  [key: string]: any
}

/**
 * Add an operator to compare array of NLU results with one given.
 * Comparisons requiring a score will use the default threshold if none given.
 * - `in`   id and/or name (or score if only score given) exists in the result
 * - `is`   id and/or name (or score if only score given) are the only result
 * - `max`  id and/or name match result with highest score
 * - `min`  id and/or name match result with lowest score
 * - `eq`   any result has score exactly equal to comparison
 * - `gte`  any result has score greater than or equal to comparison
 * - `gt`   any result has score greater than comparison
 * - `lt`   any result has score less than comparison
 * - `lte`  any result has score less than or equal to comparison
 */
export interface INLUCriteria extends INLUResult {
  operator?: 'in' | 'is' | 'match' | 'max' | 'min' | 'eq' | 'gte' | 'gt' | 'lt' | 'lte'
}

/** Array of Natural Language Understanding results */
export class NLUResult extends Array<INLUResult> {
  /**
   * Helper to see if a result has the properties of a matching element.
   * Check for matching subset (id/name) ignoring score unless only score given.
   * @param index Array index in NLU result set
   * @param criteria NLU criteria or result subset to match on (ignores score)
   */
  indexIncludes (index: number, criteria: INLUCriteria) {
    if (!Object.keys(criteria).some((key) => {
      return (['id', 'name', 'score'].includes(key))
    })) throw new Error('[nlu] NLUResult matching requires ID, name or score')
    if (this[index] === void 0) return undefined
    const { id, name, score } = criteria
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
   * When comparing score, the array is first filtered against other criteria.
   */
  match (criteria: INLUCriteria) {
    let { score, operator } = criteria
    if (!operator) operator = (typeof score === 'undefined') ? 'in' : 'gte'
    let matching: INLUResult | undefined
    let matched: INLUResult[]
    this.sortByScore()
    if (
      ['eq', 'gte', 'gt', 'lt', 'lte'].includes(operator) &&
      typeof score === 'undefined'
    ) throw new Error('[nlu] NLUResult cannot match score without score criteria')
    if (
      ['eq', 'gte', 'gt', 'lt', 'lte'].includes(operator) &&
      Object.keys(criteria).some((key) => !['score', 'operator'].includes(key))
    ) matched = this.filter((_, index) => this.indexIncludes(index, criteria))
    else matched = Array.from(this)
    if (!matched.length) return undefined
    switch (operator) {
      case 'in':
        matched = this.filter((_, index) => this.indexIncludes(index, criteria))
        return matched.length ? matched : undefined
      case 'is':
        if (this.length === 1) matching = this.indexIncludes(0, criteria)
        return matching ? [matching] : undefined
      case 'max':
        matching = this.indexIncludes(0, criteria)
        return matching ? [matching] : undefined
      case 'min':
        matching = this.indexIncludes(this.length - 1, criteria)
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

/**
 * Key literals for NLU result attributes
 * - `intent`    Characterising what the message was about
 * - `entities`  Inferred from the message or context
 * - `sentiment` Sentiment positive/negative scores
 * - `tone`      Tone information (specific to NLU service)
 * - `phrases`   The key talking points in the text
 * - `act`       How the proposition described is intended to be used
 * - `language`  The language of the text with `.id` as an ISO code
 */
export enum NLUKey { intent, entities, sentiment, tone, phrases, act, language }
export type NLUKeys = keyof typeof NLUKey

/** Collection of NLU matching criteria by key */
export type NLUCriteria = { [key in NLUKeys]?: INLUCriteria }

/** Collection of raw NLU results by key (also used for matched subset) */
export type NLUResultsRaw = { [key in NLUKeys]?: INLUResult[] }

/** Collection of NLUResult instances by key */
export type NLUResults = { [key in NLUKeys]?: NLUResult }

/**
 * NLU attributes controller.
 * NLUResults are instance of results class (not interface) to access helpers.
 */
export class NLU {
  results: NLUResults = {}

  /** Populate NLU results by key, creating result set if needed */
  addResult (key: NLUKeys, ...results: INLUResult[]) {
    if (this.results[key] instanceof NLUResult) {
      this.results[key]!.add(...results)
    } else {
      this.results[key] = new NLUResult().add(...results)
    }
    return this
  }

  /** Populate collection of NLU results */
  addResults (results: NLUResultsRaw) {
    for (let key in results) {
      let nluKey = (key as NLUKeys)
      if (results[nluKey]) this.addResult(nluKey, ...results[nluKey]!)
    }
    return this
  }

  /** Match an NLU result set by key against given criteria */
  matchCriteria (key: NLUKeys, criteria: INLUCriteria) {
    if (this.results[key]) return this.results[key]!.match(criteria)
    return undefined
  }

  /** Match collection of results against collection of criteria */
  matchAllCriteria (criteria: NLUCriteria) {
    const matched: NLUResultsRaw = {}
    for (let key in criteria) {
      let nluKey = (key as NLUKeys)
      const match = this.matchCriteria(nluKey, criteria[nluKey]!)
      if (match) matched[nluKey] = match
    }
    if (Object.keys(matched).length) return matched
    return undefined
  }

  /** Logging utility for displaying easy to read NLU results */
  printResults () {
    const outputs: string[] = []
    for (let key of Object.keys(this.results)) {
      const items = this.results[(key as NLUKeys)]
      if (items && items.length) {
        let details = items.map((item) => {
          const score = (typeof item.score !== 'undefined')
            ? ` ${item.score.toFixed(2)}`
            : ''
          return `${item.name || item.id}${score}`
        }).join(', ')
        outputs.push(`${key} (${details})`)
      }
    }
    return outputs.join(', ')
  }
}
