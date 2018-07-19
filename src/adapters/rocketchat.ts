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

  /** Create Rocket.Chat adapter, configure bot to use username as alias */
  constructor (bot: any) {
    super(bot)
    this.settings.integrationId = 'bBot'
    if (this.settings.username !== this.bot.name) this.bot.alias = this.settings.username
  }

  getRoomId = (room: string) => this.driver.getRoomId(room)
  callMethod = (method: string, ...args: any[]) => this.driver.callMethod(method, args)

  /** Connect to Rocket.Chat via DDP driver and setup message subscriptions */
  async start () {
    this.bot.logger.info(`[rocketchat] responds to name: ${this.bot.name}`)
    if (this.bot.alias) bot.logger.info(`[rocketchat] responds to alias: ${this.bot.alias}`)

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
        type: meta.roomType,
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

  /** Parse any strings before sending to fix for Rocket.Chat syntaxes */
  format (input: string) {
    return input.replace(/((?:^|\s):\w+)-(\w+:(?:$|\s))/g, '$1_$2') // fix emoji key hyphens
  }

  async dispatch (envelope: bot.Envelope) {
    switch (envelope.method) {
      case 'send':
        if (!envelope.strings) throw new Error('Sending without strings')
        if (!envelope.room || !envelope.room.id) throw new Error('Sending without room ID')
        for (let text of envelope.strings) {
          await this.driver.sendToRoomId(this.format(text), envelope.room.id)
        }
        break
      case 'dm':
        if (!envelope.strings) throw new Error('DM without strings')
        if (!envelope.user) throw new Error('DM without user')
        for (let text of envelope.strings) {
          await this.driver.sendDirectToUser(this.format(text), envelope.user.username)
        }
        break
      case 'reply':
        if (!envelope.strings) throw new Error('Reply without strings')
        if (!envelope.user) throw new Error('Reply without user')
        if (!envelope.room || !envelope.room.id) throw new Error('Reply without room ID')
        if (envelope.room.id.indexOf(envelope.user.id) === -1) {
          envelope.strings = envelope.strings.map((s) => `@${envelope.user!.username} ${s}`)
        }
        for (let text of envelope.strings) {
          await this.driver.sendToRoomId(this.format(text), envelope.room.id)
        }
        break
      case 'react':
        if (!envelope.strings) throw new Error('React without strings')
        if (!envelope.message) throw new Error('React without message')
        for (let reaction of envelope.strings) {
          if (!reaction.startsWith(':')) reaction = `:${reaction}`
          if (!reaction.endsWith(':')) reaction = `${reaction}:`
          reaction = reaction.replace('-', '_') // Rocket.Chat syntax
          await this.driver.setReaction(reaction, envelope.message.id)
        }
        break
      default:
        throw new Error(`Rocket.Chat adapter has no ${envelope.method} handler`)
    }
  }
}

export const use = (bot: any) => new Rocketchat(bot)
