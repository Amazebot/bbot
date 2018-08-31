import * as bot from '..'
import * as sdk from '@rocket.chat/sdk'

/**
 * Rocket.Chat adapter processes incoming message stream, providing the
 * their this modules as attributes for advanced branch callbacks to use.
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
    if (this.settings.username !== this.bot.settings.name) this.bot.settings.alias = this.settings.username
  }

  getRoomId = (room: string) => this.driver.getRoomId(room)
  callMethod = (method: string, ...args: any[]) => this.driver.callMethod(method, args)

  /** Connect to Rocket.Chat via DDP driver and setup message subscriptions */
  async start () {
    this.bot.logger.info(`[rocketchat] responds to name: ${this.bot.settings.name}`)
    if (this.bot.settings.alias) bot.logger.info(`[rocketchat] responds to alias: ${this.bot.settings.alias}`)

    this.driver.useLog(bot.logger)
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
    const user = bot.userById(message.u._id, {
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
    const robotIsNamed = message.msg.indexOf(bot.settings.name) === startOfText || message.msg.indexOf(bot.settings.alias) === startOfText
    if ((isDM || isLC) && !robotIsNamed) message.msg = `${bot.settings.name} ${message.msg}`

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

  /** Parsing envelope content to an array of Rocket.Chat message schemas */
  parseEnvelope (envelope: bot.Envelope, roomId?: string) {
    const messages: any[] = []
    const attachments: any[] = []
    const actions: any[] = []
    if (envelope.strings) {
      for (let text of envelope.strings) {
        messages.push(this.driver.prepareMessage(this.format(text), roomId))
      }
    }
    if (envelope.payload.attachments) {
      for (let attachment of envelope.payload.attachments) {
        attachments.push({
          fields: attachment.fields,
          color: attachment.color,
          text: attachment.pretext,
          thumb_url: attachment.thumbUrl,
          collapsed: attachment.collapsed,
          author_name: (attachment.author) ? attachment.author.name : undefined,
          author_link: (attachment.author) ? attachment.author.link : undefined,
          author_icon: (attachment.author) ? attachment.author.icon : undefined,
          title: (attachment.title) ? attachment.title.text : undefined,
          title_link: (attachment.title) ? attachment.title.link : undefined,
          image_url: attachment.image,
          audio_url: attachment.audio,
          video_url: attachment.video
        })
      }
    }
    if (envelope.payload.quickReplies) {
      for (let qr of envelope.payload.quickReplies) {
        const { text, type, content, image } = qr
        actions.push({
          text,
          type,
          msg: content,
          image_url: image,
          is_webview: true,
          msg_in_chat_window: true
        })
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

    // Append actions to existing attachment if only one,
    // otherwise create new attachment for actions.
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
    return messages
  }

  /** Dispatch envelope content, mapped to Rocket.Chat SDK methods */
  async dispatch (envelope: bot.Envelope) {
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
          envelope.strings = envelope.strings.map((s) => `@${envelope.user!.username} ${s}`)
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

export const use = (bot: any) => new Rocketchat(bot)
