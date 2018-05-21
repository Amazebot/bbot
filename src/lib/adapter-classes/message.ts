import { Adapter } from './base'
import * as bot from '../..'

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'
  async receive (message: any, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `receive` called without override', { message, strings })
  }
  async send (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `send` called without override', { envelope, strings })
  }
  async reply (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `reply` called without override', { envelope, strings })
  }
  async emote (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `emote` called without override', { envelope, strings })
  }
  async topic (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `topic` called without override', { envelope, strings })
  }
  async notify (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `notify` called without override', { envelope, strings })
  }
  async play (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `play` called without override', { envelope, strings })
  }
  async react (envelope: bot.Envelope, ...strings: string[]): Promise<any> {
    this.bot.logger.debug('Message adapter `react` called without override', { envelope, strings })
  }
}

export type MessageMethod = 'send' | 'reply' | 'emote' | 'topic' | 'notify' | 'play' | 'react'
