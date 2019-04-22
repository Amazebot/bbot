'use strict'

const chalk = require('chalk')
const { Bot } = require('bbot')
const { version } = require('bbot/package.json')
const log = console.log

log(chalk.cyan.bold(`\n👨‍⚕️ Running health check for bBot version ${chalk.blue(version)}`))

/** @todo Turn this into a promise - wait for success/fail before running next test. */
async function rocketchatCheck () {
  log(chalk.yellow('\n🚀 Rocket.Chat health check...'))
  const bot = new Bot({ 'message-adapter': 'bbot-message-rocketchat' })
  await bot.start()
  /** @todo Fix adapter type detection. */
  const adapter = bot.adapters.loaded.message
  const rid = await adapter.driver.getRoomId('bbot-testing')
  const envelope = bot.envelopes.create()
  let passed = false
  envelope.toRoomId(rid)
  envelope.write(`💛 Running health check for bBot version \`${version}\`.`)
  envelope.write(`👋 Reply if you can hear me (within 30 seconds)?`)
  envelope.payload.quickReply({ text: '👋 We hear you!' })
  
  // Ask for sign of life, answer required to pass test
  bot.branches.text(/(we|i) hear you/, async (b) => {
    await b.respond('💚 Fantastic, thanks for your help. Bye now.')
    bot.logger.info('Successful health check for Rocket.Chat')
    passed = true
    await bot.shutdown()
  })

  // After 30 seconds, if nothing received, throw error
  setTimeout(() => {
    if (!passed) bot.logger.error('Failed health check for Rocket.Chat')
    bot.shutdown()
  }, 30 * 1000)
  await envelope.dispatch()
}

rocketchatCheck().catch((err) => console.error(chalk.red(err)))
