/**
 * Demo :: List Types
 * Sets up text listeners with a variety of matching functions.
 * Shows different matching methods to trigger the same bit.
 * Run demo from project root: `ts-node src/demo/listen-types`
 */

import * as bot from '..'

// Sends flowers to the console...
bot.setupBit({
  id: 'send-flowers',
  callback: (b) => {
    bot.logger.info(`💐  - ${b.listener.id} matched on "${b.message.toString()}"`)
  }
})

// ...whenever someone says flowers
bot.listenText(/flowers?/i, 'send-flowers', { id: 'text-listener' })

// ...or mentions a known flower
const flowers = ['rose', 'tulip', 'orchid', 'iris', 'peony', 'magnolia']
bot.listenCustom((message: bot.TextMessage) => {
  return flowers.find((f) => message.text.includes(f))
}, 'send-flowers', { id: 'custom-listener' })

// ...or a custom request returns positive
const flowerLookup = async (input: any) => {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return input
}
bot.listenCustom((message: bot.TextMessage) => {
  return flowerLookup(message)
}, 'send-flowers', { id: 'custom-listener-async' })

// Process demo inputs
const user = new bot.User()
const start = async () => {
  await bot.start()
  await bot.hear(new bot.TextMessage(user, 'flowers please'))
  await bot.hear(new bot.TextMessage(user, '2 orchids for me'))
  await bot.hear(new bot.TextMessage(user, 'I <3 flowers'))
}

start().catch((err) => bot.logger.error(err))
