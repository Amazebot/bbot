/**
 * Demo :: Rocket.Chat
 * Starts a bot with the Rocket.Chat adapter.
 * Requires config: https://rocket.chat/docs/bots/configure-bot-environment/
 * Shows different listener types and adapter respond methods.
 * Run demo from project root: `ts-node src/demo/rocketchat`
 */
process.env.BOT_MESSAGE_ADAPTER = 'rocketchat'
process.env.BOT_LOG_LEVEL = 'debug'
process.env.RESPOND_TO_DM = 'true'
process.env.RESPOND_TO_EDITED = 'true'

import * as bot from '..'
export const emojiJSON: bot.IEmojis[] = require('../emojis.json')

const start = async () => {
  await bot.start()
  bot.listenText(/(\w+)/g, async (b) => {
    const reactions = []
    for (let word of b.match) {
      const emoji = emojiJSON.find((emoji: any) => emoji.short_name === word)
      if (emoji) reactions.push(word)
    }
    if (reactions.length) await b.respondVia('react', ...reactions)
  })
  bot.listenText(/.*/, async (b) => b.respond('WHAT?'), { force: true })
}

start().catch((err) => bot.logger.error(err))
