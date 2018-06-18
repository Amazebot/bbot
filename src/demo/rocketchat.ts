/**
 * Demo :: Rocket.Chat
 * Starts a bot with the Rocket.Chat adapter.
 * Requires config: https://rocket.chat/docs/bots/configure-bot-environment/
 * Shows different listener types and adapter respond methods.
 * Run demo from project root: `ts-node src/demo/rocketchat`
 * @todo Move this and adapter into it's own repo to lighten dependencies.
 */
process.env.BOT_MESSAGE_ADAPTER = '../adapters/rocketchat'
process.env.BOT_STORAGE_ADAPTER = '../adapters/mongo'
process.env.BOT_LOG_LEVEL = 'debug'
process.env.RESPOND_TO_DM = 'true'
process.env.RESPOND_TO_EDITED = 'true'

import * as bot from '..'

const start = async () => {
  await bot.start()
  /** @todo Test that states within subsequent listeners is isolated - I think it's inheriting */
  /** @todo Use https://github.com/omnidan/node-emoji to match any emoji key */
  /** @todo Add middleware parsing actual emoji in strings into their key */
  bot.listenText(/\b(sup|boom)\b/i, (b) => b.write(':punch:').respond('react'))
  bot.listenText(/\b(shit|crap)\b/i, (b) => b.write(':poop:').respond('react'))
}

start().catch((err) => bot.logger.error(err))
