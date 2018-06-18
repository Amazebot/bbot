import { Adapter } from './base'
import * as bot from '../..'

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'
  /** Open connection to messaging platform */
  async start () {
    this.bot.logger.debug('[message-adapter] `start` called without override')
  }
  /** Close connection to messaging platform */
  async shutdown () {
    this.bot.logger.debug('[message-adapter] `shutdown` called without override')
  }
  /** Process an incoming message from platform */
  async hear (message: any): Promise<any> {
    this.bot.logger.debug('[message-adapter] `hear` called without override', {
      message
    })
  }
  /** Take addressed envelope to action in platform, per given method */
  async respond (envelope: bot.Envelope, method: string): Promise<any> {
    this.bot.logger.debug(`[message-adapter] respond via ${method} called without override`, {
      envelope
    })
  }
}
