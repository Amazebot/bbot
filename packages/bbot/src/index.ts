/** Bot instance, adapter and key component classes for adapters to extend. */
export * from './bot'
export * from './components/cache'
export * from './components/condition'
export * from './components/adapter'
export * from './components/user'
export * from './components/room'
export * from './components/branch'
export * from './components/message'
export * from './components/nlu'
export * from './components/envelope'

import * as instance from './util/instance'
import * as id from './util/id'

/** Utility methods exported at root - does not reference bot instance. */
export const util = Object.assign({}, id, instance)

/** Require bot instance by default. */
import bBot from './bot'
export default bBot
