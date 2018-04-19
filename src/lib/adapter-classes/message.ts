import { Adapter } from './base'

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'
  async receive (message: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `receive` called without override', { message, strings })
  }
  async send (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `send` called without override', { envelope, strings })
  }
  async reply (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `reply` called without override', { envelope, strings })
  }
  async emote (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `emote` called without override', { envelope, strings })
  }
  async topic (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `topic` called without override', { envelope, strings })
  }
  async notify (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `notify` called without override', { envelope, strings })
  }
  async play (envelope: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `play` called without override', { envelope, strings })
  }
}
