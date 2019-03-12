import { Bot, util, abstracts, Envelope } from 'bbot'
import { driver } from '@amazebot/rocket-bot'
import { IMessageCallback } from '@amazebot/rocket-bot/lib/interfaces'

/** Mapped properties to parse platform schema differences. */
const attachmentSchema = {
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
}

/**
 * Rocket.Chat adapter processes incoming message stream, creating and
 * dispatching messages, including with rich message actions/quick replies
 * and querying rooms and users via the Rocket.Chat SDK.
 */
export class Rocketchat extends abstracts.MessageAdapter {
  name = 'rocketchat-message-adapter'
  driver = driver

  /** Connect to Rocket.Chat via DDP driver and setup message subscriptions */
  async start () {
    // this.bot.config.extend({})
    this.driver.logger = this.bot.logger
    await this.driver.login()
    const username = this.driver.username
    if (username !== this.bot.config.get('name')) {
      this.bot.config.set('alias', username)
    }
    this.bot.logger.info(`[rocketchat] logged in as @${username}`)
    await this.driver.onMessage(this.process.bind(this))
  }

  async shutdown () {
    await this.driver.logout()
    await this.driver.socket.close()
  }

  /** Parse any strings before sending to fix for Rocket.Chat syntaxes */
  format (input: string) {
    return input.replace(/((?:^|\s):\w+)-(\w+:(?:$|\s))/g, '$1_$2') // fix emoji key hyphens
  }

  /** Parsing envelope content to an array of Rocket.Chat message schemas */
  parseEnvelope (envelope: Envelope, roomId?: string) {
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
        attachments.push(util.parse(attachment, attachmentSchema, attachment))
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
        const action = util.parse(qr, schema, qr)
        actions.push(Object.assign(defaults, action))
      }
    }

    // Append actions to existing attachment if only one,
    // otherwise create new attachment for actions.
    if (actions.length) {
      if (attachments.length === 1) attachments[0].actions = actions
      else attachments.push({ actions })
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

    return messages
  }

  /** Dispatch envelope content, mapped to Rocket.Chat SDK methods */
  async dispatch (envelope: Envelope) {
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
        if (
          envelope.room.id.indexOf(envelope.user.id) === -1 &&
          envelope.strings
        ) {
          envelope.strings = envelope.strings.map((s: string) => {
            return `@${envelope.user.username} ${s}`
          })
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

  /** Collect attributes to receive every incoming message in subscription */
  process: IMessageCallback = async (err, message, meta) => {
    if (err) throw err
    if (!message) throw new Error('[rocketchat] process called without message')
    this.bot.logger.info('[rocketchat] filters passed, will hear message')
    const user = (message && message.u)
      ? this.bot.users.byId(message.u._id, {
        fullName: message.u.name,
        name: message.u.username,
        room: { id: message.rid }
      })
      : this.bot.users.blank()
    const isDM = (meta && meta.roomType === 'd')
    const isLC = (meta && meta.roomType === 'l')
    if (meta) {
      user.room.type = meta.roomType
      user.room.name = meta.roomName
    }

    // Room joins, hear without further detail
    if (message.t === 'uj') {
      this.bot.logger.debug('[rocketchat] hear type Enter')
      return this.bot.thoughts.receive(this.bot.messages.enter(user, message._id))
    }

    // Room exit, hear without further detail
    if (message.t === 'ul') {
      this.bot.logger.debug('[rocketchat] hear type Leave')
      return this.bot.thoughts.receive(this.bot.messages.leave(user, message._id))
    }

    // Direct messages prepend bot's name so bBot can respond directly
    const name = this.bot.config.get('name')
    const alias = this.bot.config.get('alias')
    const startOfText = (message.msg && message.msg.indexOf('@') === 0) ? 1 : 0
    const robotIsNamed = (
      message.msg && (
      message.msg.indexOf(name) === startOfText ||
      message.msg.indexOf(alias) === startOfText
    ))
    if ((isDM || isLC) && !robotIsNamed) message.msg = `${name} ${message.msg}`

    // Attachments, format properties as payload for bBot rich message type
    if (Array.isArray(message.attachments) && message.attachments.length) {
      this.bot.logger.debug('[rocketchat] hear type Rich')
      return this.bot.thoughts.receive(this.bot.messages.rich(user, {
        attachments: message.attachments.map((item) => {
          /* @todo 👇 final payload in received rich message needs testing */
          return util.parse(item, attachmentSchema)
        })
      }, message.msg, message._id))
    }

    // Standard text messages, hear as is
    if (message.msg && message.msg.length) {
      let textMessage = this.bot.messages.text(user, message.msg!, message._id)
      this.bot.logger.debug(`[rocketchat] hear type Text: ${textMessage.toString()}`)
      return this.bot.thoughts.receive(textMessage)
    }

    // Ran out of options
    throw new Error(`[rocketchat] could not process message: ${JSON.stringify(message)}`)
  }
}

/** Adapter singleton (ish) require pattern. */
let rocketchat: Rocketchat
export const use = (bBot: Bot) => {
  if (!rocketchat) rocketchat = new Rocketchat(bBot)
  return rocketchat
}
