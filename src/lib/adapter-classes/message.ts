import { Adapter } from './base'
import * as bot from '../..'

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'
  async hear (message: any): Promise<any> {
    this.bot.logger.debug('Message adapter `hear` called without override', { message })
  }
  /** Respond takes current state, containing envelope */
  async respond (envelope: bot.Envelope, method: string): Promise<any> {
    this.bot.logger.debug(`Message adapter ${method} called without override`, { envelope })
  }
}
