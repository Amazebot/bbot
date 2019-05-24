import {
  RTMClient,
  WebClient,
  ChatPostMessageArguments,
  ChatPostEphemeralArguments
} from '@slack/client'
import {
  ICallback,
  IUser,
  isUser,
  IConversation,
  IEvent,
  IBot,
  IConnection
} from './interfaces'

const fallbackHandler: ICallback = (err, result) => {
  if (err) throw err
  else console.log(`[slack] event result ${JSON.stringify(result)}`)
}

/** Connection handler for Slack RTM and Web clients. */
export class SlackClient {
  rtm: RTMClient
  web: WebClient
  botUserIdMap: { [id: string]: IBot }
  messageHandler: ICallback
  userHandler: ICallback
  pageSize = 100
  connection?: IConnection

  /**
   * Client initialisation.
   * @todo pass bot logger to RTM after implementing `setLevel` and `setName`.
   * @todo optimise sessions by looking at other RTM and Web client options.
   */
  constructor (token: string, handlers: {
    message?: ICallback,
    user?: ICallback
  } = {}) {
    this.rtm = new RTMClient(token)
    this.web = new WebClient(token, { maxRequestConcurrency: 1 })

    // Map to convert bot user IDs (BXXXXXXXX) to user representations for
    // events from custom integrations and apps without a bot user.
    this.botUserIdMap = { 'B01': { id: 'B01', user_id: 'USLACKBOT' } }

    // Event handling
    this.rtm.on('message', this.eventWrapper, this)
    this.rtm.on('reaction_added', this.eventWrapper, this)
    this.rtm.on('reaction_removed', this.eventWrapper, this)
    this.rtm.on('member_joined_channel', this.eventWrapper, this)
    this.rtm.on('member_left_channel', this.eventWrapper, this)
    this.rtm.on('user_change', this.eventWrapper, this)
    this.messageHandler = handlers.message || fallbackHandler
    this.userHandler = handlers.user || fallbackHandler
  }

  /** Set message event handler. */
  onMessage (callback: (err: Error, result: any) => void) {
    if (this.messageHandler !== callback) this.messageHandler = callback
  }

  /** Set user update handler. */
  onUser (callback: (err: Error, result: any) => void) {
    if (this.userHandler !== callback) this.userHandler = callback
  }

  /** Process events with given handler. */
  async eventWrapper (e: IEvent) {
    // ignore self originated events
    if (this.connection && e.user === this.connection.self.id) return

    if (e.type === 'user_change' && isUser(e.user) && this.userHandler) {
      return this.userHandler(e)
    }

    if (this.eventHandler) return this.eventHandler(e)
  }

  /** Open connection to the Slack RTM API. */
  async connect () {
    const result = await this.rtm.start()
    if (result.ok) {
      this.connection = (result as any)
      return this.connection!
    } else {
      throw new Error(result.error)
    }
  }

  /** Disconnect from the Slack RTM API */
  disconnect () {
    this.rtm.disconnect()
    this.rtm.removeAllListeners()
  }

  /** Set a channel's topic */
  setTopic (channel: string, topic: string) {
    return this.web.conversations.setTopic({ channel, topic })
  }

  /** Respond to incoming Slack message or dispatch unprompted. */
  send (message: ChatPostMessageArguments) {
    const defaults = { as_user: true, link_names: 1 } // post message options
    return this.web.chat.postMessage(Object.assign(message, defaults))
  }

  /** Send an ephemeral message to a user in a given channel */
  sendEphemeral (message: ChatPostEphemeralArguments) {
    const defaults = { as_user: true, link_names: 1 } // post message options
    return this.web.chat.postEphemeral(Object.assign(message, defaults))
  }

  /** Set a reaction (emoji) on a given message. */
  addReaction (name: string, channel: string, timestamp: string) {
    return this.web.reactions.add({ name, channel, timestamp })
  }

  /** Do API list request/s, concatenating paginated results */
  async getList (collection: string) {
    let items: any[] = []
    const limit = this.pageSize
    let cursor: string | undefined
    let pageComplete: boolean = false
    if (Object.keys(this.web).indexOf(collection) === -1) {
      throw new Error(`[slack] client has no list method for ${collection} collection`)
    }
    do {
      const results: any = await (this.web as any)[collection].list({ limit, cursor })
      if (!results || !results.ok) throw new Error(`[slack] no results returned for ${collection} list`)
      if (results.response_metadata) cursor = results.response_metadata.next_cursor
      if (results[collection] && results[collection].length) {
        items = items.concat(results[collection])
      }
      if (
        !results[collection]
        || !results[collection].length
        || cursor === ''
        || typeof cursor === 'undefined'
      ) pageComplete = true // no remaining users/pages, don't continue lookup
    } while (!pageComplete)
    return items
  }

  /** Fetch users from Slack API. */
  async loadUsers () {
    const members: IUser[] = await this.getList('members')
    return members
  }

  /** Get the type of a conversation. */
  conversationType (conversation: IConversation) {
    if (conversation.is_channel) return 'channel'
    else if (conversation.is_im) return 'im'
    else if (conversation.is_mpim) return 'mpim'
    else if (conversation.is_shared) return 'share'
    else if (conversation.is_group) return 'group'
  }

  /** Fetch channels from Slack API. */
  async loadChannels () {
    const channels: IConversation[] = await this.getList('channels')
    return channels
  }

  /** Open direct message channel with a user (or resume cached) */
  async openDirect (user: string) {
    const result = await this.web.im.open({ user })
    if (result.ok) return result.channel as IConversation
    throw new Error(`[slack] failed to open IM channel with user: ${JSON.stringify(user)}`)
  }

  /** Get conversation/channel by its ID (from cache if available). */
  async conversationById (channel: string) {
    const result = await this.web.conversations.info({ channel })
    if (result.ok) return result.channel as IConversation
    throw new Error(`[slack] could not find conversation by ID: ${channel}`)
  }

  /** Get channel by its name (has to load all and filter). */
  async channelByName (name: string) {
    const channels = await this.loadChannels()
    return channels.find((channel) => channel.name === name)
  }

  /** Get just the ID from a channel by name. */
  async channelIdByName (name: string) {
    const channel = await this.channelByName(name)
    if (channel) return channel.id as string
    throw new Error(`[slack] could not find channel by name: ${name}`)
  }

  /** Get the user by their ID (from cache if available). */
  async userById (user: string) {
    const result = await this.web.users.info({ user })
    if (result.ok) return result.user as IUser
    throw new Error(`[slack] could not find user by ID: ${user}`)
  }

  /** Get a bot user by its ID (from internal collection if available). */
  async botById (bot: string) {
    if (!this.botUserIdMap[bot]) {
      const result = await this.web.bots.info({ bot })
      if (result.ok) this.botUserIdMap[bot] = result.bot as IBot
    }
    return this.botUserIdMap[bot]
  }
}
