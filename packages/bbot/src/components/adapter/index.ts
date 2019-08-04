/**
 * Provide interfaces to external platforms for messaging, NLU, storage etc.
 * @module components/adapter
 */

import { Bot } from '../../bot'
import { AdapterController } from './controller'

/** Make adapter controller with bot instance for dependencies */
export function makeAdapterController (bot: Bot) {
  return new AdapterController({
    getAdapterPath: (type: string) => bot.config.get(`${type}-adapter`)
  })
}
