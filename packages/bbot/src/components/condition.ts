/**
 * Use simple semantic conditions to create matching expressions.
 * @module components/condition
 */

// @ts-ignore
import rangeRegex from 'to-regex-range'
import logger from '../util/logger'

/**
 * Key literals for condition attributes.
 * Behaviour alternates depending on `matchWord` option.
 * @todo Refactor ConditionKey to Operator, keys to Operators
 */
export enum ConditionKey {
  is,       // Match whole input
  starts,   // Match beginning / first word
  ends,     // Match end / last word
  contains, // Match part / word
  excludes, // Negative match part / word
  after,    // Match anything after value / next word
  before,   // Match anything before value / prev word
  range     // Match a given range (only between 0-999, otherwise use regexp)
}
export type keys = keyof typeof ConditionKey

/** One or more condition key/value pairs. */
export type Condition = { [key in keys]?: string | string[] }

/** Collection of condition types assigned to named keys. */
export type Collection = { [key: string]: Condition }

  /** Mix of accepted types for conditions constructor. */
export type ConditionInput = string | RegExp | Condition | Condition[] | Collection

/** Type guard to check type of Condition. */
function isCondition (c: any): c is Condition {
  if (!Object.keys(c).length) return false
  for (let key in c) {
    const validKeys = Object.keys(ConditionKey).filter((k) => {
      return isNaN(Number(k)) === true
    })
    if (validKeys.indexOf(key) < 0) return false
  }
  return true
}

/** Type guard to check type of Collection */
function isCollection (c: any): c is Collection {
  if (!Object.keys(c).length) return false
  for (let key in c) {
    if (!isCondition(c[key])) return false
  }
  return true
}

/** Interface for condition options, matching modifiers. */
export interface IOptions {
  [key: string]: any
  matchWord?: boolean         // apply word boundaries to regex patterns
  ignoreCase?: boolean        // ignore case on regex patterns
  ignorePunctuation?: boolean // make punctuation optional for matching
}

const _defaults: IOptions = {
  matchWord: true,
  ignoreCase: true,
  ignorePunctuation: false
}

/**
 * Utils for converting semantic key/value condition to regex capture groups.
 * Also accepts straight regex or strings to convert to regex.
 */
export class Expression {
  /** Convert strings to regular expressions */
  fromString (str: string) {
    const match = str.match(new RegExp('^/(.+)/(.*)$'))
    let re: RegExp | null = null
    if (match) re = new RegExp(match[1], match[2])
    if (!match || !(re instanceof RegExp)) {
      throw new Error(`[expression] ${str} can not convert to expression`)
    }
    return re
  }

  /** Escape any special regex characters */
  escape (str: string) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
  }

  /**
   * Create regex for a value from various condition types
   * @todo combining patterns only works in correct order - can do better
   * @todo make this function modular for better testing of each logic piece
   */
  fromCondition (
    condition: Condition,
    options: IOptions = _defaults
  ) {
    const config = Object.assign({}, _defaults, options)
    const b = (config.matchWord) ? '\\b' : '' // word boundary regex toggle
    const i = (config.ignoreCase) ? 'i' : ''  // ignore case flag toggle
    const p = (config.ignorePunctuation)
      ? `\\,\\-\\:\\[\\]\\/\\(\\)\\+\\?\\.\\'\\$`
      : '\\,\\-\\:'
    const patterns: string[] = []
    for (let cKey of Object.keys(condition)) {
      const type = (cKey as keys)
      let matchValues = condition[type]
      if (typeof matchValues === 'undefined') {
        throw new Error(`Error making expression for undefined values in ${condition}[${type}]`)
      }
      if (typeof matchValues === 'string') matchValues = [matchValues]
      matchValues = matchValues.map((matchValue) => {
        let isValidRegex = true
        try { new RegExp(matchValue) } catch (_) { isValidRegex = false }
        if (type !== 'range' && !isValidRegex) {
          matchValue = this.escape(matchValue)
        }
        if (config.ignorePunctuation) {
          matchValue = matchValue.replace(/([^\\\w\s])/g, '$1+')
        }
        return matchValue
      })
      const v = matchValues.join('|') // make all values options for match
      switch (type) {
        case 'is': patterns.push(`^(${v})$`); break
        case 'starts': patterns.push(`^(${v})${b}`); break
        case 'ends': patterns.push(`${b}(${v})$`); break
        case 'contains': patterns.push(`${b}(${v})${b}`); break
        case 'excludes': patterns.push(`^((?!${b}${v}${b}).)*$`); break
        case 'after': patterns.push(`(?:${v}\\s?)([\\w\\-\\s${p}]+)`); break
        case 'before': patterns.push(`([\\w\\-\\s${p}]+)(?:\\s?${v})`); break
        case 'range':
          const rangeExp = rangeRegex(v.split('-')[0], v.split('-')[1])
          patterns.push(`${b}(${rangeExp})${b}`)
          break
      }
    }

    for (let i in patterns) {
      // leave last pattern unchanged
      const next = parseInt(i, 10) + 1
      if (!patterns[next]) break

      // remove duplicate patterns (first occurrence), e.g. from before then after
      const groups = patterns[i].match(/(\(.+?\))/g)
      if (groups && groups[1] && patterns[next].indexOf(groups[1]) === 0) {
        patterns[i] = patterns[i].replace(groups[1], '')
      }

      // convert all capture groups to non-capture (last pattern exempted)
      const newGroups = patterns[i].match(/(\(.+?\))/g)
      if (newGroups) {
        patterns[i] = newGroups.map((group) => (group.indexOf('(?') !== 0)
          ? group.replace('(', '(?:')
          : group
        ).join('')
      }
    }
    if (!patterns.length) return new RegExp(/.*/, i)

    // combine multiple condition type patterns, capturing only the last
    const regex = (patterns.length > 1)
      ? new RegExp(`${patterns.join('\\s?')}`, i)
      : new RegExp(patterns[0], i)
    return regex
  }
}

export const expression = new Expression()

/**
 * Convert range of arguments into a collection of regular expressions.
 * Config changes flags and filtering. Multiple conditions can be combined.
 */
export class Conditions {
  config: IOptions
  expressions: { [key: string]: RegExp } = {}
  matches: {
    [key: string]: RegExpMatchArray | undefined
    [key: number]: RegExpMatchArray | undefined
  } = {}
  captures: {
    [key: string]: string | undefined
    [key: number]: string | undefined
  } = {}

  /**
   * Created new conditions instance.
   * Generate expressions from conditions and options.
   */
  constructor (condition?: ConditionInput, options: IOptions = {}) {
    this.config = Object.assign({}, _defaults, options)
    if (!condition) return
    if (
      typeof condition === 'string' ||
      condition instanceof RegExp ||
      isCondition(condition)
    ) {
      this.add(condition)
    } else if (condition instanceof Array) {
      for (let c of condition) this.add(c)
    } else if (isCollection(condition)) {
      for (let key in condition) this.add(condition[key], key)
    }
  }

  /**
   * Add new condition, converted to regular expression.
   * Assigns to either an integer index (as string), or a given key.
   * Returns self for chaining multiple additions.
   */
  add (condition: string | RegExp | Condition, key?: string | number) {
    if (!key) key = Object.keys(this.expressions).length
    try {
      let regex: RegExp
      if (condition instanceof RegExp) {
        regex = condition
      } else if (typeof condition === 'string') {
        regex = expression.fromString(condition)
      } else {
        regex = expression.fromCondition(condition, this.config)
      }
      if (regex) this.expressions[key] = regex
      else throw new Error('failed to make expression')
    } catch (err) {
      logger.error(`[condition] Error adding ${JSON.stringify(condition)} (key: ${key}) ${err}`)
      throw err
    }
    return this
  }

  /** Test a string against all expressions. */
  exec (str: string) {
    for (let key in this.expressions) {
      const match = str.match(this.expressions[key])
      this.matches[key] = match || undefined
      const capture = (match || []).filter((v) => (typeof v === 'string'))
      capture.shift() // remove first match not in capture groups
      const replace = /(^[\,\-\:\s]*)|([\,\-\:\s]*$)/g // suffix/prefix punctuation
      this.captures[key] = (typeof capture[0] === 'string')
        ? capture[0].replace(replace, '').trim()
        : undefined
    }
    return this.matches
  }

  /** Get cumulative success (all matches truthy). */
  get success () {
    return (Object.keys(this.matches).every((key) => {
      return typeof this.matches[key] !== 'undefined'
    }))
  }

  /** Get success of all matches or the first match object if only one */
  get match () {
    let matchKeys = Object.keys(this.matches)
    return (matchKeys.length > 1)
      ? this.success
      : this.matches[matchKeys[0]]
  }

  /** Get the result of all matches or the first if only one and no keys used */
  get matched () {
    let matchKeys = Object.keys(this.matches)
    if (
      matchKeys.length > 1 ||
      matchKeys.some((key) => isNaN(parseInt(key, 10)))
    ) return this.matches
    else if (matchKeys.length === 1) return this.matches[matchKeys[0]]
  }

  /** Get all captured strings, or the first if only one and no keys used */
  get captured () {
    let matchKeys = Object.keys(this.matches)
    if (
      matchKeys.length > 1 ||
      matchKeys.some((key) => isNaN(parseInt(key, 10)))
    ) return this.captures
    else if (matchKeys.length === 1) return this.captures[matchKeys[0]]
  }

  /** Clear results but keep expressions and config. */
  clear () {
    this.matches = {}
    this.captures = {}
  }

  /** Clear expressions too, just keep config. */
  clearAll () {
    this.clear()
    this.expressions = {}
  }
}
