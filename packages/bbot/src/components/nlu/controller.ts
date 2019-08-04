/**
 * Represent and handle results from natural language platforms.
 * @module components/nlu
 */

import { NLU } from './class'
import {
  NLUKeys,
  INLUResult,
  NLUResultSet,
  NLUQuerySet,
  INLUQuery
} from './interface'

/** NLU attributes and results controller. */
export class NLUController {
  results: { [key in NLUKeys]?: NLU } = {}

  /** Populate NLU results by key, creating result set if needed */
  addResult (key: NLUKeys, ...results: INLUResult[]) {
    if (this.results[key] instanceof NLU) {
      this.results[key]!.add(...results)
    } else {
      this.results[key] = new NLU().add(...results)
    }
    return this
  }

  /** Populate collection of NLU results */
  addResults (results: NLUResultSet) {
    for (let key in results) {
      let nluKey = (key as NLUKeys)
      if (results[nluKey]) this.addResult(nluKey, ...results[nluKey]!)
    }
    return this
  }

  /** Match an NLU result set by key against given query */
  match (key: NLUKeys, query: INLUQuery) {
    if (this.results[key]) return this.results[key]!.match(query)
  }

  /** Match collection of results against collection of queries */
  matchAll (queries: NLUQuerySet) {
    const matched: NLUResultSet = {}
    for (let key in queries) {
      let nluKey = (key as NLUKeys)
      const match = this.match(nluKey, queries[nluKey]!)
      if (match) matched[nluKey] = match
    }
    if (Object.keys(matched).length) return matched
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
