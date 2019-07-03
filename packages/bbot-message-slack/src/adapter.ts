// import { Bot, util, abstracts, Envelope, caches } from 'bbot'
// import { MessageAttachment, AttachmentAction } from '@slack/web-api'
// import { SlackClient } from './slack'

// /**
//  * Slack adapter processes incoming message stream, creating and dispatching
//  * messages, including with rich message actions/quick replies and queries.
//  */
// export class SlackAdapter extends abstracts.MessageAdapter {
//   name = 'rocketchat-message-adapter'
//   cache: caches.Cache
//   client: SlackClient

//   /**
//    * Create Slack client and empty cache for user and channel request results.
//    * Defaults keep 100 results for 5 minutes.
//    * Users are kept longer (12hrs) because their data is updated with an event.
//    */
//   constructor (bot: Bot) {
//     super(bot)
//     this.bot.config.extend({
//       'slack-user-token': {
//         type: 'string',
//         required: true
//       }
//     })
//     this.bot.config.load()
//     this.client = new SlackClient(this.bot.config.get('slack-user-token'), {
//       userHandler: this.receiveUser.bind(this),
//       messageHandler: this.receiveMessage.bind(this)
//     })
//     this.cache = caches.create(this.client)
//     this.cache.setup('conversationById')
//     this.cache.setup('channelIdByName')
//     this.cache.setup('userById', { maxAge: 60 * 60 * 12 * 1000 })
//   }

//   /** Connect to Slack workspace and setup message subscriptions. */
//   async start () {
//     const { self } = await this.client.connect()
//     this.bot.logger.info(`[slack] connected as ${self.name} (ID ${self.id})`)
//   }

//   /** Unsubscribe and disconnect from Slack workspace. */
//   async shutdown () {
//     this.client.disconnect()
//   }

//   /** Dispatch envelopes to Slack via defined methods */
//   async dispatch (envelope: Envelope) {
//     switch (envelope.method) {
//       case 'send' :
//         for (let message of this.parseEnvelope(envelope)) {
//           await this.client.send(message)
//         }
//         break
//       case 'thread' :
//         if (!envelope.message) throw new Error('Thread without message')
//         for (let message of this.parseEnvelope(envelope)) {
//           message.thread_ts = envelope.message.thread_ts
//           await this.client.send(message)
//         }
//         break
//       case 'ephemeral' :
//         if (!envelope.user) throw new Error('Ephemeral without user')
//         if (!envelope.room.id) throw new Error('Ephemeral without channel')
//         for (let message of this.parseEnvelope(envelope)) {
//           message.user = envelope.user.id
//           await this.client.sendEphemeral(message)
//         }
//         break
//       case 'direct' :
//         if (!envelope.strings) throw new Error('DM without strings')
//         if (!envelope.user) throw new Error('DM without user')
//         const im = await this.client.openDirect(envelope.user.id)
//         if (!im) throw new Error(`[slack] could not send, failed to open IM for ${envelope.user.id}`)
//         for (let message of this.parseEnvelope(envelope)) {
//           message.channel = im.id
//           await this.client.send(message)
//         }
//         break
//       case 'react' :
//         if (!envelope.strings) throw new Error('React without string')
//         if (!envelope.room.id) throw new Error('React without channel')
//         if (!envelope.message) throw new Error('React without message')
//         for (let reaction of envelope.strings) {
//           reaction = reaction.replace(':', '')
//           reaction = reaction.replace('-', '_')
//           await this.client.addReaction(reaction, envelope.room.id, envelope.message.id)
//         }
//         break
//       case 'topic' :
//         if (!envelope.strings) throw new Error('Topic without strings')
//         if (!envelope.room.id) throw new Error('Topic without channel')
//         await this.client.setTopic(envelope.room.id, envelope.strings[0])
//     }
//   }

//   /** Handle user change event data from Slack client. */
//   async receiveUser (user: any) {
//     this.bot.users.byId(user.id, user)
//     this.cache.reset('userById', user.id)
//   }

//   /** Collect attributes from Slack events, to receive as bBot messages. */
//   async onEvent (message) {

//     // receive appropriate bot message type
//     if (e.type === 'member_joined_channel') {
//       this.bot.logger.debug(`[slack] ${user.name} joined ${user.room.name}`)
//       return this.bot.receive(new bBot.EnterMessage(user, id))
//     } else if (e.type === 'member_left_channel') {
//       this.bot.logger.debug(`[slack] ${user.name} joined ${e.channel}`)
//       return this.bot.receive(new bBot.LeaveMessage(user, id))
//     } else if (e.type === 'message') {
//       if (Array.isArray(e.attachments) || Array.isArray(e.files)) {
//         this.bot.logger.debug(`[slack] rich message from ${user.name}`)
//         const attachments = e.attachments || e.files
//         return this.bot.receive(new bBot.RichMessage(user, {
//           attachments,
//           text: e.text
//         }, id))
//       }
//       return this.bot.receive(new bBot.TextMessage(user, e.text, id))
//     }
//   }
//   // cache calls
//   // openDirect
//   // conversationById
//   // channelByName
//   // channelIdByName

//   /**
//    * Parsing envelope content to an array of Slack message schemas.
//    * Channel argument is only required to override the original envelope room
//    * ID or if the envelope isn't in response to incoming message with room ID.
//    */
//   parseEnvelope (envelope: Envelope, channel?: string) {
//     if (!channel) channel = (envelope.room) ? envelope.room.id : undefined
//     if (!channel) throw new Error('[slack] cannot parse envelope without channel ID')
//     const messages: any[] = []
//     const attachments: MessageAttachment[] = []
//     const actions: AttachmentAction[] = []
//     // Create basic message for each string
//     if (envelope.strings) {
//       for (let text of envelope.strings) messages.push({ text, channel })
//     }
//     // Convert attachments to Slack schema from bBot payload attachment schema
//     if (envelope.payload && Array.isArray(envelope.payload.attachments)) {
//       for (let attachment of envelope.payload.attachments) {
//         attachments.push(util.parse(attachment, {
//           'thumb_url': 'thumbUrl',
//           'author_name': 'author.name',
//           'author_link': 'author.link',
//           'author_icon': 'author.icon',
//           'title': 'title.text',
//           'title_link': 'title.link',
//           'image_url': 'image'
//         }, attachment))
//       }
//     }
//     // bBot actions schema is same as Slack, parseSchema not required
//     if (envelope.payload && Array.isArray(envelope.payload.actions)) {
//       for (let action of envelope.payload.actions) actions.push(action as AttachmentAction)
//     }
//     // Append actions to existing attachment if only one,
//     // otherwise create new attachment for actions.
//     if (actions.length) {
//       if (attachments.length === 1) attachments[0].actions = actions
//       else attachments.push({ actions })
//     }
//     // Append attachments to existing message if only one,
//     // otherwise create new message for attachments.
//     if (attachments.length) {
//       if (messages.length === 1) messages[0].attachments = attachments
//       else messages.push({ text: '', channel, attachments })
//     }
//     return messages
//   }
// }

// // // get from cache
// // const cachedId = cache.get('channelIdByName', name)
// // if (cachedId) return cachedId
// // // not in cache

// /** Adapter singleton (ish) require pattern. */
// let adapter: SlackAdapter
// export const use = (bBot: Bot) => {
//   if (!adapter) adapter = new SlackAdapter(bBot)
//   return adapter
// }
