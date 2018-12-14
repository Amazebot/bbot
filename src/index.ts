import config from './lib/config'
import adapters from './lib/adapters'

/** Primary parent class for bBot import typing. */
export class Bot {
  adapters = adapters
  config = config
}

/** Bot instance, almost always imported instead of class. */
export const bBot = new Bot()

/** Function to return bot at runtime (avoiding circular imports). */
export const getBot = () => bBot

/** Default export made available for different import/requires usage. */
export default bBot
