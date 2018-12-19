/**
 * @module instance
 * Handle various transformations of instance types and properties.
 */

/** Deep clone any class or object via JSON conversion. */
export const clone = (obj: any) => JSON.parse(JSON.stringify(obj))

/** Convert instance to plain object for storage. */
export function convert (data: any, excludes: string[] = []) {
  if (typeof data === 'object') {
    data = clone(Object.keys(data)
      .filter((key) => !excludes.includes(key))
      .reduce((obj: any, key) => {
        if (typeof obj[key] !== 'function') obj[key] = data[key]
        return obj
      }, {})
    )
  }
  return data
}

/** Convert plain objects into their original class. */
export function restore (data: any, namespace: string) {
  return require(`../${namespace}`).create(data)
}

/**
 * Utility to convert internal object to schema required in adapter platform.
 * Passing the original internal object as the external, allows inheriting
 * all attributes without needing to map the ones that are the same in both.
 * Otherwise, result would only include values from defined schema fields.
 */
export function parse (
  internal: any,
  schema: { [path: string]: string },
  external: any = {}
) {
  const converted: any = {}
  const target = (external.constructor.name !== 'Object')
    ? Object.create(external)
    : clone(external)
  for (let key in schema) {
    const valueAtPath = schema[key].split('.').reduce((pre, cur) => {
      return (typeof pre !== 'undefined') ? pre[cur] : undefined
    }, internal)
    if (typeof valueAtPath !== 'undefined') {
      converted[key] = valueAtPath
      delete target[schema[key]] // remove anything re-mapped
    }
  }
  return Object.assign(target, converted)
}
