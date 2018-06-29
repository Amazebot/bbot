import * as bot from '..'
import * as sdk from '@rocket.chat/sdk'

/**
 * Rocket.Chat adapter processes incoming message stream, providing the
 * their this modules as attributes for advanced listener callbacks to use.
 * Provides member alias to some SDK methods, to support legacy Hubot scripts.
 */
export class Rocketchat extends bot.MessageAdapter {
  name = 'rocketchat-message-adapter'
  driver = sdk.driver
  methodCache = sdk.methodCache
  api = sdk.api
  settings = sdk.settings

  constructor (bot: any) {
    super(bot)
    this.settings.integrationId = 'bBot'
    this.bot.logger.info('[rocketchat] using Rocket.Chat as message adapter')
  }

  getRoomId = (room: string) => this.driver.getRoomId(room)
  callMethod = (method: string, ...args: any[]) => this.driver.callMethod(method, args)

  /** Connect to Rocket.Chat via DDP driver and setup message subscriptions */
  async start () {
    this.bot.logger.info(`[rocketchat] Rocket.Chat adapter in use`)

    // Print logs with current configs
    this.bot.logger.info(`[rocketchat] responds to name: ${bot.name}`)
    if (this.bot.alias) bot.logger.info(`[rocketchat] responds to alias: ${bot.alias}`)

    this.driver.useLog(bot.logger)
    await this.driver.connect()
    await this.driver.login()
    await this.driver.subscribeToMessages()
    await this.driver.respondToMessages(this.process.bind(this))
    this.bot.logger.debug(`[rocketchat] connected via DDP`)
  }

  /** Cancel subscriptions and disconnect from Rocket.Chat */
  async shutdown () {
    this.driver.disconnect()
  }

  /** Collect attributes to receive every incoming message in subscription */
  process (err: Error | null, message: any, meta: any) {
    if (err) throw err
    this.bot.logger.info('[rocketchat] filters passed, will hear message')
    const isDM = (meta.roomType === 'd')
    const isLC = (meta.roomType === 'l')
    const user = bot.userById(message.u._id, {
      name: message.u.username,
      alias: message.alias,
      room: {
        id: message.rid,
        type: message.roomType,
        name: meta.roomName
      }
    })

    // Room joins, hear without further detail
    if (message.t === 'uj') {
      bot.logger.debug('[rocketchat] hear type EnterMessage')
      return bot.receive(new bot.EnterMessage(user, message._id))
    }

    // Room exit, hear without further detail
    if (message.t === 'ul') {
      bot.logger.debug('[rocketchat] hear type LeaveMessage')
      return bot.receive(new bot.LeaveMessage(user, message._id))
    }

    // Direct messages prepend bot's name so bBot can respond directly
    const startOfText = (message.msg.indexOf('@') === 0) ? 1 : 0
    const robotIsNamed = message.msg.indexOf(bot.name) === startOfText || message.msg.indexOf(bot.alias) === startOfText
    if ((isDM || isLC) && !robotIsNamed) message.msg = `${bot.name} ${message.msg}`

    // Attachments, format properties as payload for bBot rich message type
    if (Array.isArray(message.attachments) && message.attachments.length) {
      bot.logger.debug('[rocketchat] hear type RichMessage')
      return bot.receive(new bot.RichMessage(user, {
        attachments: message.attachments,
        text: message.text
      }, message._id))
    }

    // Standard text messages, hear as is
    let textMessage = new bot.TextMessage(user, message.msg, message._id)
    bot.logger.debug(`[rocketchat] hear type TextMessage: ${textMessage.toString()}`)
    return bot.receive(textMessage)
  }

  async dispatch (envelope: bot.Envelope) {
    switch (envelope.method) {
      case 'send':
        if (!envelope.strings) throw new Error('Sending without strings')
        if (!envelope.room || !envelope.room.id) throw new Error('Sending without room ID')
        for (let text in envelope.strings) {
          await this.driver.sendToRoomId(text, envelope.room.id)
        }
        break
      case 'dm':
        if (!envelope.strings) throw new Error('DM without strings')
        if (!envelope.user) throw new Error('DM without user')
        for (let text in envelope.strings) {
          await this.driver.sendDirectToUser(text, envelope.user.username)
        }
        break
      case 'reply':
        if (!envelope.strings) throw new Error('Reply without strings')
        if (!envelope.user) throw new Error('Reply without user')
        if (!envelope.room || !envelope.room.id) throw new Error('Reply without room ID')
        if (envelope.room.id.indexOf(envelope.user.id) === -1) {
          envelope.strings = envelope.strings.map((s) => `@${envelope.user!.username} ${s}`)
        }
        for (let text in envelope.strings) {
          await this.driver.sendToRoomId(text, envelope.room.id)
        }
        break
      case 'react':
        if (!envelope.strings) throw new Error('React without strings')
        if (!envelope.message) throw new Error('React without message')
        for (let emoji in envelope.strings) {
          if (!emoji.startsWith(':')) emoji = `:${emoji}`
          if (!emoji.endsWith(':')) emoji = `${emoji}:`
          emoji = emoji.replace('-', '_') // Rocket.Chat syntax
          await this.driver.setReaction(emoji, envelope.message.id)
        }
        break
      default:
        throw new Error(`Rocket.Chat adapter has no ${envelope.method} handler`)
    }
  }
}

export const use = (bot: any) => new Rocketchat(bot)
