/**
 * Manage component instances with unique identifiers.
 * @module util/id
 */

import crypto from 'crypto'

/** Maintain a count of created IDs against their prefix key. */
export const counts: { [key: string]: number } = { 'uid': 0 }

/**
 * Get the next value in global counter.
 * @param prefix Key for counter, prepend to return value
 */
export function counter (prefix: string = 'uid') {
  if (!Object.keys(counts).includes(prefix)) counts[prefix] = 0
  counts[prefix]++
  return `${prefix}_${counts[prefix]}`
}

/**
 * Generate a random unique ID value.
 * @param prefix Optionally prepend ID type
 */
export function random (prefix?: string) {
  const id = crypto.randomBytes(16).toString('hex')
  if (prefix) return `${prefix}_${id}`
  else return id
}
