import { bBot, Bot } from './bot'
import * as abstracts from './adapters/abstract'
import * as components from './components'
import * as controllers from './controllers'

/** Bot instance, component and adapter classes for adapters to extend. */
export { bBot, Bot, abstracts, components, controllers }

/** Require bot instance by default. */
export default bBot
