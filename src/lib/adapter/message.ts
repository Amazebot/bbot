import { Adapter, IAdapter } from './index'

/** @todo Update envelope/user type with proper interface */
export interface IMessageAdapter extends IAdapter {
  send: (envelope: any, ...strings: string[]) => Promise<any>,
  emote: (envelope: any, ...strings: string[]) => Promise<any>,
  reply: (envelope: any, ...strings: string[]) => Promise<any>,
  topic: (envelope: any, ...strings: string[]) => Promise<any>,
  play: (envelope: any, ...strings: string[]) => Promise<any>,
  receive: (message: any, ...strings: string[]) => Promise<any>
}

/**
 * Message Adapter class, extended to connect bBot with messaging platform.
 * Methods are just raw endpoints to be extended.
 */
export class MessageAdapter extends Adapter implements IMessageAdapter {
  name = 'message-adapter'
  async send (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `send` called without override')
  }
  async emote (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `emote` called without override')
  }
  async reply (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `reply` called without override')
  }
  async topic (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `topic` called without override')
  }
  async notify (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `notify` called without override')
  }
  async play (envelope: any, ...strings: string[]) {
    this.logger.debug('Message adapter `play` called without override')
  }
  async receive (message: any, ...strings: string[]) {
    this.logger.debug('Message adapter `receive` called without override')
  }
}
