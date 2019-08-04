
/** Interface for Natural Language Understanding attributes. */
export interface INLUResult {
  /** The primary text code for a result */
  id?: string
  /** A display name equivalent for the ID */
  name?: string
  /** The positivity or confidence rating of the result */
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
export interface INLUQuery extends INLUResult {
  operator?: 'in' | 'is' | 'match' | 'max' | 'min' | 'eq' | 'gte' | 'gt' | 'lt' | 'lte'
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
export type NLUQuerySet = { [key in NLUKeys]?: INLUQuery }

/** Collection of raw NLU results by key (also used for matched subset) */
export type NLUResultSet = { [key in NLUKeys]?: INLUResult[] }
