import crypto from 'crypto'

/**
 * Maintain a list of global counters against their prefix key
 */
const counts: { [key: string]: number } = { 'uid': 0 }

/**
 * Get the next value in global counter
 * @param prefix Key for counter, prepend to return value
 */
export function counter (prefix: string = 'uid'): string {
  if (!Object.keys(counts).includes(prefix)) counts[prefix] = 0
  counts[prefix]++
  return `${prefix}_${counts[prefix]}`
}

/**
 * Generate a random unique ID value
 * @param prefix Optionally prepend ID type
 */
export function random (prefix?: string): string {
  const id = crypto.randomBytes(16).toString('hex')
  if (prefix) return `${prefix}_${id}`
  else return id
}
