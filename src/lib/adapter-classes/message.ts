import { Adapter } from './base'
import * as bot from '../..'

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'
  /** Open connection to messaging platform */
  async open () {
    this.bot.logger.debug('Message adapter `open` called without override')
  }
  /** Close connection to messaging platform */
  async close () {
    this.bot.logger.debug('Storage adapter `close` called without override')
  }
  /** Process an incoming message from platform */
  async hear (message: any): Promise<any> {
    this.bot.logger.debug('Message adapter `hear` called without override', {
      message
    })
  }
  /** Take addressed envelope to action in platform, per given method */
  async respond (envelope: bot.Envelope, method: string): Promise<any> {
    this.bot.logger.debug(`Message adapter ${method} called without override`, {
      envelope
    })
  }
}
