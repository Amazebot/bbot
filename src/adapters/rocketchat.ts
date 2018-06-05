import * as bot from '..'
import * as sdk from '@rocket.chat/sdk'

export class Rocketchat extends bot.MessageAdapter {
  name = 'rocketchat-message-adapter'
  constructor (bot: any) {
    super(bot)
    sdk.settings.integrationId = 'bBot'
    this.bot.logger.info('Using Rocket.Chat as message adapter')
  }

  async start () {
    this.bot.logger.info(`[startup] Rocket.Chat adapter in use`)

    // Make SDK modules available to scripts, via `adapter.`
    this.driver = sdk.driver
    this.methodCache = sdk.methodCache
    this.api = sdk.api
    this.settings = sdk.settings

    // Print logs with current configs
    this.bot.logger.info(`[startup] Respond to name: ${this.bot.name}`)
    this.bot.alias = (this.bot.name === sdk.settings.username || this.bot.alias)
      ? this.bot.alias
      : sdk.settings.username
    if (this.bot.alias) {
      this.bot.logger.info(`[startup] Respond to alias: ${this.bot.alias}`)
    }

    sdk.driver.useLog(bot.logger)
    await sdk.driver.connect()
    await sdk.driver.login()
    await sdk.driver.subscribeToMessages()
    await sdk.driver.respondToMessages(this.process.bind(this)) // reactive callback
  }

  /** Process every incoming message in subscription */
  /** @todo Add proper message and meta types from SDK exported interfaces */
  process (err: Error, message: any, meta: any) {
    if (err) throw err
    // Prepare message type for bBot to receive...
    this.bot.logger.info('Filters passed, will receive message')

    // Collect required attributes from message meta
    const isDM = (meta.roomType === 'd')
    const isLC = (meta.roomType === 'l')
    const user = this.bot.brain.userForId(message.u._id, {
      name: message.u.username,
      alias: message.alias
    })
    user.roomID = message.rid
    user.roomType = meta.roomType
    user.room = meta.roomName || message.rid

    // Room joins, receive without further detail
    if (message.t === 'uj') {
      this.bot.logger.debug('Message type EnterMessage')
      return this.bot.receive(new bot.EnterMessage(user, message._id))
    }

    // Room exit, receive without further detail
    if (message.t === 'ul') {
      this.bot.logger.debug('Message type LeaveMessage')
      return this.bot.receive(new bot.LeaveMessage(user, message._id))
    }

    // Direct messages prepend bot's name so bBot can respond directly
    const startOfText = (message.msg.indexOf('@') === 0) ? 1 : 0
    const robotIsNamed = message.msg.indexOf(this.bot.name) === startOfText || message.msg.indexOf(this.bot.alias) === startOfText
    if ((isDM || isLC) && !robotIsNamed) message.msg = `${this.bot.name} ${message.msg}`

    // Attachments, format properties as payload for bBot rich message type
    if (Array.isArray(message.attachments) && message.attachments.length) {
      this.bot.logger.debug('Message type RichMessage')
      return this.bot.receive(new bot.RichMessage(user, {
        attachments: message.attachments,
        text: message.text
      }, message._id))
    }

    // Standard text messages, receive as is
    let textMessage = new bot.TextMessage(user, message.msg, message._id)
    this.bot.logger.debug(`TextMessage: ${textMessage.toString()}`)
    return this.bot.hear(textMessage)
  }

  async respond (envelope: bot.Envelope, method: string) {
    switch (method) {
      case 'send':
        if (!envelope.strings) throw new Error('Sending without strings')
        if (!envelope.room.id) throw new Error('Sending without room ID')
        for (let text in envelope.strings) {
          await sdk.driver.sendToRoomId(text, envelope.room.id)
        }
        break
      case 'dm':
        if (!envelope.strings) throw new Error('Sending without strings')
        if (!envelope.user) throw new Error('Sending direct without user')
        for (let text in envelope.strings) {
          await sdk.driver.sendDirectToUser(text, envelope.user.username)
        }
        break
      case 'reply':
        if (!envelope.strings) throw new Error('Sending without strings')
        if (!envelope.user) throw new Error('Reply without user')
        if (!envelope.room.id) throw new Error('Sending without room ID')
        if (envelope.room.id.indexOf(envelope.user.id) === -1) {
          envelope.strings = envelope.strings.map((s) => `@${envelope.user!.username} ${s}`)
        }
        for (let text in envelope.strings) {
          await sdk.driver.sendToRoomId(text, envelope.room.id)
        }
        break
      case 'react':
        console.log('TODO: Add Rocket.Chat react method', envelope.strings)
        break
    }
  }

  /** Get a room ID via sdk */
  getRoomId (room: string) {
    return sdk.driver.getRoomId(room)
  }

  /** Call a server message via sdk */
  callMethod (method: string, ...args: any[]) {
    return sdk.driver.callMethod(method, args)
  }
}

export const use = (bot: any) => new Rocketchat(bot)

/** Define new message type for handling attachments */
class AttachmentMessage extends bot.TextMessage {
  constructor (user: bot.User, public attachment: any, text: string, id: string) {
    super(user, text, id)
  }
  toString () {
    return this.attachment
  }
}
