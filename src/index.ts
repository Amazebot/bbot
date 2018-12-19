/** Bot instance, adapter and key component classes for adapters to extend. */
export { Bot } from './bot'
export * from './components/adapter'
export * from './components/user'
export * from './components/room'
export * from './components/branch'
export * from './components/message'
export * from './components/nlu'
export * from './components/envelope'

/** Require bot instance by default. */
import bBot from './bot'
export default bBot
