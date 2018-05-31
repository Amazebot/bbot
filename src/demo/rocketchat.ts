import * as bot from '..'

bot.config.messageAdapter = 'adapters/rocketchat'
bot.config.storageAdapter = 'adapters/mongo'

const start = async () => {
  await bot.start()
}

start().catch((err) => bot.logger.error(err))
