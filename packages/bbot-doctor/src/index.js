'use strict'

const chalk = require('chalk')
const { Bot } = require('bbot')
const { version } = require('bbot/package.json')
const log = console.log

log(chalk.cyan.bold(`\n👨‍⚕️ Running health check for bBot version ${chalk.blue(version)}`))

async function rocketchatCheck () {
  log(chalk.yellow('\n🚀 Rocket.Chat health check...'))
  const rocketBot = new Bot({ 'message-adapter': 'bbot-message-rocketchat' })
  await rocketBot.start()
}

rocketchatCheck().catch((err) => console.error(chalk.red(err)))
