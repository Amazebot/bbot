import * as bot from '..'

/** Branch matcher function interface, resolved value must be truthy. */
export interface IMatcher {
  (input: any): Promise<any> | any
}

/** Branch callback interface, called if the message matched. */
export interface IBranchCallback {
  (b: bot.State): any
}

/** Called at the end of middleware with status of match */
export interface IBranchDone {
  (matched: boolean): void
}

/** Hold extra key/value data for extensions to use, such as ID */
export interface IBranch {
  id?: string
  force?: boolean
  [key: string]: any
}

/**
 * Process message in state and decide whether to act on it.
 * @param action Accepts an on-match callback, or creates one to execute a bit,
 *               by passing its key. The callback be given the final state.
 * @param meta   Any additional key/values to define the branch, such as 'id'
 */
export abstract class Branch {
  id: string
  callback: IBranchCallback
  force: boolean = false
  match?: any
  matched?: boolean
  [key: string]: any

  /** Create a Branch */
  constructor (
    action: IBranchCallback | string,
    options: IBranch = {}
  ) {
    this.callback = (typeof action === 'string')
      ? (state) => bot.doBit(action, state)
      : action
    this.id = (options.id) ? options.id : bot.counter('branch')
    for (let key in options) this[key] = options[key]
  }

  /**
   * Determine if this branch should trigger the callback.
   * Note that the method must be async, custom matcher will be promise wrapped.
   * Abstract input has no enforced type, but resolved result MUST be truthy.
   */
  abstract matcher (input: any): Promise<any>

  /**
   * Runs the matcher, then middleware and callback if matched.
   * Middleware can intercept and prevent the callback from executing.
   * If the state has already matched on prior branch, it will not match again
   * unless forced to, with the branch's `force` property.
   * @param b          State containing message to process
   * @param middleware Executes before the branch callback if matched
   * @param done       Called after middleware (optional), with match status
   */
  async process (
    b: bot.State,
    middleware: bot.Middleware,
    done: IBranchDone = () => null
  ) {
    if (!b.matched || this.force) {
      this.match = await Promise.resolve(this.matcher(b.message))
      this.matched = (this.match) ? true : false
      if (this.matched) {
        b.setBranch(this)
        await middleware.execute(b, (b) => {
          bot.logger.debug(`[branch] executing ${this.constructor.name} callback, ID ${this.id}`)
          // @todo Fix workaround for thought process timestamp ordering
          // vvvvv If this is an NLU branch, it should not apply a `listen` timestamp
          b.processed.listen = Date.now()
          return Promise.resolve(this.callback(b))
        }).then(() => {
          bot.logger.debug(`[branch] ${this.id} process done (${(this.matched) ? 'matched' : 'no match'})`)
          return Promise.resolve(done(true))
        }).catch((err) => {
          bot.logger.error(`[branch] ${this.id} middleware error, ${err.message}`)
          return Promise.resolve(done(false))
        })
      } else {
        await Promise.resolve(done(false))
      }
    }
    return b
  }
}

/** Branch to match on any CatchAllMessage type */
export class CatchAllBranch extends Branch {
  /** Accepts only super args, matcher is fixed */
  constructor (action: IBranchCallback | string, options?: IBranch) {
    super(action, options)
  }

  /** Matching function looks for any CatchAllMessage */
  async matcher (message: bot.Message) {
    if (message instanceof bot.CatchAllMessage) {
      bot.logger.debug(`[branch] message "${message}" matched catch all ID ${this.id}`)
      return message
    }
    return undefined
  }
}

/** Custom branch using unique matching function */
export class CustomBranch extends Branch {
  /** Accepts custom function to test message */
  constructor (
    public customMatcher: IMatcher,
    action: IBranchCallback | string,
    options?: IBranch
  ) {
    super(action, options)
  }

  /** Standard matcher method routes to custom matching function */
  async matcher (message: bot.Message) {
    const match = await Promise.resolve(this.customMatcher(message))
    if (match) {
      bot.logger.debug(`[branch] message "${message}" matched custom branch ID ${this.id}`)
    }
    return match
  }
}

/** Text branch uses basic regex matching */
export class TextBranch extends Branch {
  conditions: bot.Conditions

  /** Create text branch for regex pattern */
  constructor (
    conditions: string | RegExp | bot.Condition | bot.Condition[] | bot.ConditionCollection | bot.Conditions,
    callback: IBranchCallback | string,
    options?: IBranch
  ) {
    super(callback, options)
    this.conditions = (conditions instanceof bot.Conditions)
      ? conditions
      : new bot.Conditions(conditions)
  }

  /**
   * Match message text against regex or composite conditions.
   * Resolves with either single match result or cumulative condition success.
   */
  async matcher (message: bot.Message) {
    this.conditions.exec(message.toString())
    const match = this.conditions.match
    if (match) {
      bot.logger.debug(`[branch] message "${message}" matched branch ${this.id} conditions`)
    }
    return match
  }
}

/**
 * Text Direct Branch pre-matches the text for bot name prefix.
 * If matched on the direct pattern (name prefix) it runs the branch matcher on
 * a clone of the message with the prefix removed, this allows conditions like
 * `is` to operate on the body of the message, without failing due to a prefix.
 */
export class TextDirectBranch extends TextBranch {
  async matcher (message: bot.TextMessage) {
    if (directPattern().exec(message.toString())) {
      const indirectMessage = message.clone()
      indirectMessage.text = message.text.replace(directPattern(), '')
      return super.matcher(indirectMessage)
    } else {
      return false
    }
  }
}

/**
 * Natural language branch uses NLU result to match on intent, entities and/or
 * sentiment of optional score threshold. NLU must be trained to provide intent.
 */
export class NaturalLanguageBranch extends Branch {
  match: bot.NaturalLanguageResultsRaw | undefined

  /** Create natural language branch for NLU matching. */
  constructor (
    public criteria: bot.NaturalLanguageCriteria,
    callback: IBranchCallback | string,
    options?: IBranch
  ) {
    super(callback, options)
  }

  /** Match on message's NLU attributes */
  async matcher (message: bot.TextMessage) {
    if (!message.nlu) {
      bot.logger.error(`[branch] NaturalLanguageBranch attempted matching without NLU, ID ${this.id}`)
      return undefined
    }
    const match = message.nlu.matchAllCriteria(this.criteria)
    if (match) {
      bot.logger.debug(`[branch] NLU matched language branch ID ${this.id}`)
      return match
    }
    return undefined
  }
}

/** Natural Language Direct Branch pre-matches the text for bot name prefix */
export class NaturalLanguageDirectBranch extends NaturalLanguageBranch {
  async matcher (message: bot.TextMessage) {
    if (directPattern().exec(message.toString())) {
      return super.matcher(message)
    } else {
      return undefined
    }
  }
}

/**
 * Build a regular expression that matches text prefixed with the bot's name
 * - matches when alias is substring of name
 * - matches when name is substring of alias
 */
export function directPattern () {
  const botName = bot.settings.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!bot.settings.alias) {
    return new RegExp(`^\\s*[@]?${botName}[:,]?\\s*`, 'i')
  }
  const botAlias = bot.settings.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (botName.length > botAlias.length) {
    return new RegExp(`^\\s*[@]?(?:${botName}[:,]?|${botAlias}[:,]?)\\s*`, 'i')
  }
  return new RegExp(`^\\s*[@]?(?:${botAlias}[:,]?|${botName}[:,]?)\\s*`, 'i')
}

/** Build a regular expression for bot's name combined with another regex */
export function directPatternCombined (regex: RegExp) {
  const regexWithoutModifiers = regex.toString().split('/')
  regexWithoutModifiers.shift()
  const modifiers = regexWithoutModifiers.pop()
  const pattern = regexWithoutModifiers.join('/')
  const botName = bot.settings.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!bot.settings.alias) {
    return new RegExp(`^\\s*[@]?${botName}[:,]?\\s*(?:${pattern})`, modifiers)
  }
  const botAlias = bot.settings.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (botName.length > botAlias.length) {
    return new RegExp(`^\\s*[@]?(?:${botName}[:,]?|${botAlias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }
  return new RegExp(`^\\s*[@]?(?:${botAlias}[:,]?|${botName}[:,]?)\\s*(?:${pattern})`, modifiers)
}
