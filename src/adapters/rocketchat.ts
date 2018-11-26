import * as bBot from '..'
import * as sdk from '@rocket.chat/sdk'

/**
 * Rocket.Chat adapter processes incoming message stream, creating and
 * dispatching messages, including with rich message actions/quick replies
 * and querying rooms and users via the Rocket.Chat SDK.
 */
export class Rocketchat extends bBot.MessageAdapter {
  name = 'rocketchat-message-adapter'
  driver = sdk.driver
  methodCache = sdk.methodCache
  api = sdk.api
  settings = sdk.settings

  /** Singleton pattern instance */
  private static instance: Rocketchat

  /** Singleton instance init */
  static getInstance (bot: typeof bBot) {
    if (!Rocketchat.instance) Rocketchat.instance = new Rocketchat(bot)
    return Rocketchat.instance
  }

  /**
   * Create Rocket.Chat adapter, configure bot to use username as alias.
   * Prevent direct access to constructor for singleton adapter
   */
  private constructor (bot: typeof bBot) {
    super(bot)
    this.settings.integrationId = 'bBot'
    if (this.settings.username !== this.bot.settings.name) this.bot.settings.alias = this.settings.username
  }

  getRoomId = (room: string) => this.driver.getRoomId(room)
  callMethod = (method: string, ...args: any[]) => this.driver.callMethod(method, args)

  /** Connect to Rocket.Chat via DDP driver and setup message subscriptions */
  async start () {
    this.bot.logger.info(`[rocketchat] responds to name: ${this.bot.settings.name}`)
    if (this.bot.settings.alias) this.bot.logger.info(`[rocketchat] responds to alias: ${this.bot.settings.alias}`)

    this.driver.useLog(this.bot.logger)
    await this.driver.connect()
    await this.driver.login()
    await this.driver.subscribeToMessages()
    await this.driver.respondToMessages(this.process.bind(this))
    this.bot.logger.debug(`[rocketchat] connected via DDP`)
  }

  /** Cancel subscriptions and disconnect from Rocket.Chat */
  async shutdown () {
    await this.driver.disconnect()
  }

  /** Collect attributes to receive every incoming message in subscription */
  process (err: Error | null, message: any, meta: any) {
    if (err) throw err
    this.bot.logger.info('[rocketchat] filters passed, will hear message')
    const isDM = (meta.roomType === 'd')
    const isLC = (meta.roomType === 'l')
    const user = this.bot.user.byId(message.u._id, {
      fullName: message.u.name,
      name: message.u.username,
      room: {
        id: message.rid,
        type: meta.roomType,
        name: meta.roomName
      }
    })

    // Room joins, hear without further detail
    if (message.t === 'uj') {
      this.bot.logger.debug('[rocketchat] hear type EnterMessage')
      return this.bot.receive(new bBot.EnterMessage(user, message._id))
    }

    // Room exit, hear without further detail
    if (message.t === 'ul') {
      this.bot.logger.debug('[rocketchat] hear type LeaveMessage')
      return this.bot.receive(new bBot.LeaveMessage(user, message._id))
    }

    // Direct messages prepend bot's name so bBot can respond directly
    const startOfText = (message.msg.indexOf('@') === 0) ? 1 : 0
    const robotIsNamed = message.msg.indexOf(this.bot.settings.name) === startOfText || message.msg.indexOf(this.bot.settings.alias) === startOfText
    if ((isDM || isLC) && !robotIsNamed) message.msg = `${this.bot.settings.name} ${message.msg}`

    // Attachments, format properties as payload for bBot rich message type
    if (Array.isArray(message.attachments) && message.attachments.length) {
      this.bot.logger.debug('[rocketchat] hear type RichMessage')
      return this.bot.receive(new bBot.RichMessage(user, {
        attachments: message.attachments,
        text: message.text
      }, message._id))
    }

    // Standard text messages, hear as is
    let textMessage = new bBot.TextMessage(user, message.msg, message._id)
    this.bot.logger.debug(`[rocketchat] hear type TextMessage: ${textMessage.toString()}`)
    return this.bot.receive(textMessage)
  }

  /** Parse any strings before sending to fix for Rocket.Chat syntaxes */
  format (input: string) {
    return input.replace(/((?:^|\s):\w+)-(\w+:(?:$|\s))/g, '$1_$2') // fix emoji key hyphens
  }

  /** Parsing envelope content to an array of Rocket.Chat message schemas */
  parseEnvelope (envelope: bBot.Envelope, roomId?: string) {
    const messages: any[] = []
    const attachments: any[] = []
    const actions: any[] = []
    if (envelope.strings) {
      for (let text of envelope.strings) {
        messages.push(this.driver.prepareMessage(this.format(text), roomId))
      }
    }
    if (envelope.payload && Array.isArray(envelope.payload.attachments)) {
      for (let attachment of envelope.payload.attachments) {
        attachments.push(this.parseSchema(attachment, {
          'text': 'pretext',
          'thumb_url': 'thumbUrl',
          'author_name': 'author.name',
          'author_link': 'author.link',
          'author_icon': 'author.icon',
          'title': 'title.text',
          'title_link': 'title.link',
          'image_url': 'image',
          'audio_url': 'audio',
          'video_url': 'video'
        }, attachment))
      }
    }
    if (envelope.payload && Array.isArray(envelope.payload.quickReplies)) {
      for (let qr of envelope.payload.quickReplies) {
        const defaults: any = {
          is_webview: true,
          webview_height_ratio: 'full',
          button_alignment: 'vertical',
          temporary_buttons: false
        }
        const schema = {
          'msg': 'content',
          'image_url': 'image'
        }
        if (qr.text && !qr.url && !qr.msg) qr.msg = qr.text // default msg == text
        if (qr.msg) defaults.msg_in_chat_window = true // @todo issue #11994
        const action = this.parseSchema(qr, schema, qr)
        actions.push(Object.assign(defaults, action))
      }
    }

    // Append actions to existing attachment if only one,
    // otherwise create new attachment for actions.
    if (actions.length) {
      if (attachments.length === 1) {
        attachments[0].actions = actions
      } else {
        attachments.push({ actions })
      }
    }

    // Append attachments to existing message if only one,
    // otherwise create new message for attachments.
    if (attachments.length) {
      if (messages.length === 1) {
        messages[0].attachments = attachments
      } else {
        messages.push(this.driver.prepareMessage({
          rid: roomId || envelope.room.id || null,
          attachments
        }, roomId))
      }
    }

    // Update the integration ID for all messages
    for (let i in messages) {
      messages[i].bot = { i: this.settings.integrationId }
    }

    return messages
  }

  /** Dispatch envelope content, mapped to Rocket.Chat SDK methods */
  async dispatch (envelope: bBot.Envelope) {
    switch (envelope.method) {
      case 'send':
        if (!envelope.room || !envelope.room.id) {
          throw new Error('Sending without room ID')
        }
        for (let message of this.parseEnvelope(envelope)) {
          await this.driver.sendToRoomId(message, envelope.room.id)
        }
        break
      case 'dm':
        if (!envelope.strings) throw new Error('DM without strings')
        if (!envelope.user) throw new Error('DM without user')
        for (let message of this.parseEnvelope(envelope)) {
          await this.driver.sendDirectToUser(message, envelope.user.username)
        }
        break
      case 'reply':
        if (!envelope.user) throw new Error('Reply without user')
        if (!envelope.room || !envelope.room.id) throw new Error('Reply without room ID')
        if (envelope.room.id.indexOf(envelope.user.id) === -1 && envelope.strings) {
          envelope.strings = envelope.strings.map((s) => `@${envelope.user.username} ${s}`)
        }
        for (let message of this.parseEnvelope(envelope)) {
          await this.driver.sendToRoomId(message, envelope.room.id)
        }
        break
      case 'react':
        if (!envelope.strings) throw new Error('React without string')
        if (!envelope.message) throw new Error('React without message')
        for (let reaction of envelope.strings) {
          if (!reaction.startsWith(':')) reaction = `:${reaction}`
          if (!reaction.endsWith(':')) reaction = `${reaction}:`
          reaction = reaction.replace('-', '_') // Rocket.Chat emoji syntax
          await this.driver.setReaction(reaction, envelope.message.id)
        }
        break
      default:
        throw new Error(`Rocket.Chat adapter has no ${envelope.method} handler`)
    }
  }
}

export const use = (bot: any) => Rocketchat.getInstance(bot)
