import config from '../util/config'

/**
 * Build a regular expression that matches text prefixed with the bot's name.
 * - matches when alias is substring of name
 * - matches when name is substring of alias
 */
export function directPattern () {
  let name = config.get('name') || ''
  let alias = config.get('alias') || ''
  name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  alias = alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!alias.length) return new RegExp(`^\\s*[@]?${name}[:,]?\\s*`, 'i')
  if (name.length > alias.length) {
    return new RegExp(`^\\s*[@]?(?:${name}[:,]?|${alias}[:,]?)\\s*`, 'i')
  }
  return new RegExp(`^\\s*[@]?(?:${alias}[:,]?|${name}[:,]?)\\s*`, 'i')
}

/** Build a regular expression for bot's name combined with another regex. */
export function directPatternCombined (regex: RegExp) {
  const regexWithoutModifiers = regex.toString().split('/')
  regexWithoutModifiers.shift()
  const modifiers = regexWithoutModifiers.pop()
  const pattern = regexWithoutModifiers.join('/')
  let name = config.get('name') || ''
  let alias = config.get('alias') || ''
  name = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  alias = alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  if (!alias.length) {
    return new RegExp(`^\\s*[@]?${name}[:,]?\\s*(?:${pattern})`, modifiers)
  }
  if (name.length > alias.length) {
    return new RegExp(`^\\s*[@]?(?:${name}[:,]?|${alias}[:,]?)\\s*(?:${pattern})`, modifiers)
  }
  return new RegExp(`^\\s*[@]?(?:${alias}[:,]?|${name}[:,]?)\\s*(?:${pattern})`, modifiers)
}
