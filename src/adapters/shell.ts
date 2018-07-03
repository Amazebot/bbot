import * as bBot from '..'

export class Shell extends bBot.MessageAdapter {
  name = 'shell-message-adapter'

  async start () {
    this.bot.logger.info('[shell] using Shell as message adapter')
  }

  async shutdown () {
    console.log('shutting down')
  }

  async dispatch () {
    console.log('printing ')
  }
}

export const use = (bot: typeof bBot) => new Shell(bot)
