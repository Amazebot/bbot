import { MessageAdapter } from '..'

export class Shell extends MessageAdapter {
  name = 'shell-message-adapter'
  constructor (bot: any) {
    super(bot)
    console.log(Object.keys(this.bot))
    this.bot.logger.info('Using Shell as message adapter')
  }
}

export const use = (bot: any) => new Shell(bot)
