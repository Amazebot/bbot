/**
 * Demo :: Rocket.Chat
 * Starts a bot with the Rocket.Chat adapter.
 * Requires config: https://rocket.chat/docs/bots/configure-bot-environment/
 * Shows different listener types and adapter respond methods.
 * Run demo from project root: `ts-node src/demo/rocketchat`
 */
import * as bot from '..'

bot.config.messageAdapter = '../adapters/rocketchat'
bot.config.storageAdapter = '../adapters/mongo'

const start = async () => {
  await bot.start()
}

start().catch((err) => bot.logger.error(err))
