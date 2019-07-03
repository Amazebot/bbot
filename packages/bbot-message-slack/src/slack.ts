import {
  RTMClient
} from '@slack/rtm-api'
import {
  WebClient,
  ChatPostMessageArguments,
  ChatPostEphemeralArguments
} from '@slack/web-api'

export interface IConnection {
  url: string,
  team: { id: string, name: string, domain: string },
  self: { id: string, name: string },
  scopes: string[],
  acceptedScopes: string[]
}

export interface IBot {
  id: string
  deleted?: boolean
  name?: string
  updated?: number
  user_id?: string
  app_id?: string
  icons?: {
    image_36: string
    image_48: string
    image_72: string
  }
}

export interface IUser {
  id: string
  team_id: string
  name: string
  deleted: boolean
  color: string
  real_name: string
  tz: string
  tz_label: string
  tz_offset: number
  profile: IProfile
  is_admin: boolean
  is_owner: boolean
  is_primary_owner: boolean
  is_restricted: boolean
  is_ultra_restricted: boolean
  is_bot: boolean
  is_stranger: boolean
  updated: number
  is_app_user: boolean
  has_2fa: boolean
  locale: string
}
export function isUser (arg: any): arg is IUser {
  return arg.profile !== undefined
}

export interface IProfile {
  avatar_hash: string
  status_text: string
  status_emoji: string
  status_expiration: number
  real_name: string
  display_name: string
  real_name_normalized: string
  display_name_normalized: string
  email: string
  image_24: string
  image_32: string
  image_48: string
  image_72: string
  image_192: string
  image_512: string
  team: string
}

export interface ITopic {
  value: string
  creator: string
  last_set: number
}

export interface IPurpose {
  value: string
  creator: string
  last_set: number
}

export interface IConversation {
  id: string
  name: string
  is_channel: boolean
  is_group: boolean
  is_private: boolean
  is_mpim: boolean
  is_im: boolean
  created: number
  creator: string
  is_archived: boolean
  is_general: boolean
  name_normalized: string
  is_shared: boolean
  is_org_shared: boolean
  is_member: boolean
  members: string[]
  topic: ITopic
  purpose: IPurpose
  previous_names: any[]
  num_members: number
}
export function isConversation (arg: any): arg is IConversation {
  return arg.members !== undefined
}

/** Real Time Message socket event interface. */
export interface IEvent {
  type: string
  user: string | IUser
  item: {
    type: string
    channel: string
    ts: number
  }
  event_id: string
  event_ts: number
  [key: string]: any
}

/** Type-guard for valid RTM events. */
export function isEvent (arg: any): arg is IEvent {
  return arg.type !== undefined
}

/** Generic event callback. */
export interface IEventHandler { (event: IEvent): void }

/** Map for bot IDs to user for events from integrations without bot user. */
export interface IBotUserMap { [id: string]: IBot }

/** Connection handler for Slack RTM and Web clients. */
export class SlackClient {
  rtm: RTMClient
  web: WebClient
  pageSize = 100
  eventHandlers: { [key: string]: IEventHandler } = {}
  botUserMap: IBotUserMap = { 'B01': { id: 'B01', user_id: 'USLACKBOT' } }
  connection?: IConnection

  /**
   * Client initialisation and event handler mapping.
   * @todo pass bot logger to RTM after implementing `setLevel` and `setName`.
   * @todo optimise sessions by looking at other RTM and Web client options.
   */
  constructor (token: string) {
    this.rtm = new RTMClient(token, { autoReconnect: true })
    this.web = new WebClient(token, { maxRequestConcurrency: 1 })
    this.rtm.on('message', this.eventWrapper, this)
    this.rtm.on('member_joined_channel', this.eventWrapper, this)
    this.rtm.on('member_left_channel', this.eventWrapper, this)
    this.rtm.on('user_change', this.eventWrapper, this)
    this.rtm.on('start', () => console.log('started'))
    /* @todo handle full range of events, e.g. reactions etc */
    // this.rtm.on('reaction_added', this.eventWrapper, this)
    // this.rtm.on('reaction_removed', this.eventWrapper, this)
  }

  /** Open connection to the Slack RTM API. */
  async connect () {
    const rtm = await this.rtm.start()
    const web = await this.web.api.test()
    if (rtm.ok && web.ok) {
      this.connection = (rtm as any)
      return this.connection
    } else {
      throw new Error(rtm.error || web.error)
    }
  }

  /** Disconnect from the Slack RTM API */
  async disconnect () {
    await this.rtm.disconnect()
  }

  /** Process events with given handler. */
  async eventWrapper (e: IEvent) {
    console.log('EVENT', e)
    // ignore self originated events
    if (this.connection && e.user === this.connection.self.id) return

    /*
    // handle user change event
    if (e.type === 'user_change' && isUser(e.user)) {
      return this.eventHandlers.userChange(null, { user: e.user })
    }

    // get user, channel and meta from event data
    const user = await this.getEventUser(e)
    const channel = await this.getEventChannel(e)
    const id = e.client_msg_id || e.event_id
    const ts = e.event_ts.toString()

    // handle join channel event message
    if (e.type === 'member_joined_channel') {
      return this.eventHandlers.onJoin(null, { user, channel, id, ts })
    }

    // handle leave channel event message
    if (e.type === 'member_left_channel') {
      return this.eventHandlers.onLeave(null, { user, channel, id, ts })
    }

    // handle plain or rich message events
    if (e.type === 'message') {
      const attachments = e.attachments || e.files
      const text = e.text
      const result = 
      return this.eventHandlers
    }
    */
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

  /**
   * Populate user from event's user or bot data.
   * Most events don't include full user, so in that case we look it up or
   * create a user object from minimal known attributes, which might be just ID.
   */
  // async getUserMeta (e: IEvent) {
  //   if (e.user && isUser(e.user)) return e.user
  //   if (e.user) return this.userById(e.user)
  //   if (e.bot_id) return this.botById(e.bot_id)
  //   return { id: 'null' } as IUser
  // }

  /** Populate channel from event data. */
  // async getChannelMeta (channel: string | IConversation) {
  //   const conversation = (isConversation(channel)) return channel
  //   const conversation = this.conversationById(channel)
  //     return {
  //       id: channel.id,
  //       name: channel.name,
  //       type: this.conversationType(e.channel)
  //     } as IChannelData
  //   }
  // }

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

  /** Get a bot user by its ID (recognising apps without bot user). */
  async botById (bot: string) {
    if (!this.botUserMap[bot]) {
      const result = await this.web.bots.info({ bot })
      if (result.ok) this.botUserMap[bot] = result.bot as IBot
    }
    return this.botUserMap[bot]
  }
}
