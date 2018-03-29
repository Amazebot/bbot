import * as bbot from '../index'

export class Shell extends bbot.MessageAdapter {
  constructor () {
    super()
    this.logger.info('Using Shell as message adapter')
  }
}

export const use = () => new Shell()
