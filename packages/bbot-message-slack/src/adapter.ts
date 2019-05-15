import { Bot, Envelope, Message, abstracts, caches } from 'bbot'
import { SlackClient } from './slack'

/** Extend bBot Message prototype with Slack fields. */
// abstract class SlackMessage extends Message {
//   thread?: string // thread ID : https://api.slack.com/docs/message-threading
// }

/**
 * Slack adapter processes incoming message stream, creating and dispatching
 * messages, including with rich message actions/quick replies and queries.
 */
export class SlackAdapter extends abstracts.MessageAdapter {
  name = 'rocketchat-message-adapter'
  cache = caches.Cache
  client = SlackClient

  /**
   * Create Slack client and empty cache for user and channel request results.
   * Defaults keep 100 results for 5 minutes.
   * Users are kept longer (12hrs) because their data is updated with an event.
   */
  constructor (bot: Bot) {
    super(bot)
    this.bot.config.extend({
      'slack-user-token': {
        type: 'string',
        required: true
      }
    })
    this.bot.config.load()
    this.client = new SlackClient(this.bot.config.get('slack-user-token'))
    const cache = caches.create(this.client)
    cache.setup('conversationById')
    cache.setup('channelIdByName')
    cache.setup('userById', { maxAge: 60 * 60 * 12 * 1000 })
  }

  /** Connect to Slack workspace and setup message subscriptions. */
  async start () {
    const { self } = await this.client.connect()
    this.bot.logger.info(`[slack] connected as ${self.name} (ID ${self.id})`)
  }

  /** Unsubscribe and disconnect from Slack workspace. */
  async shutdown () {
    this.client.disconnect()
  }

  /** Dispatch envelopes to Slack via defined methods */
  async dispatch (envelope: bBot.Envelope) {
    switch (envelope.method) {
      case 'send' :
        for (let message of this.parseEnvelope(envelope)) {
          await this.client.send(message)
        }
        break
      case 'ephemeral' :
        if (!envelope.user) throw new Error('Ephemeral without user')
        if (!envelope.room.id) throw new Error('Ephemeral without channel')
        for (let message of this.parseEnvelope(envelope)) {
          message.user = envelope.user.id
          await this.client.ephemeral(message)
        }
        break
      case 'direct' :
        if (!envelope.strings) throw new Error('DM without strings')
        if (!envelope.user) throw new Error('DM without user')
        const im = await this.client.openDirect(envelope.user.id)
        if (!im) throw new Error(`[slack] could not send, failed to open IM for ${envelope.user.id}`)
        for (let message of this.parseEnvelope(envelope)) {
          message.channel = im.id
          await this.client.send(message)
        }
        break
      case 'react' :
        if (!envelope.strings) throw new Error('React without string')
        if (!envelope.room.id) throw new Error('React without channel')
        if (!envelope.message) throw new Error('React without message')
        for (let reaction of envelope.strings) {
          reaction = reaction.replace(':', '')
          reaction = reaction.replace('-', '_')
          await this.client.react(reaction, envelope.room.id, envelope.message.id)
        }
        break
    }
  }
}

/** Adapter singleton (ish) require pattern. */
let adapter: SlackAdapter
export const use = (bBot: Bot) => {
  if (!adapter) adapter = new SlackAdapter(bBot)
  return adapter
}
