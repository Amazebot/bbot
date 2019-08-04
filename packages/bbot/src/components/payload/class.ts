import { IAttachment, IAction, IQuickReply } from './interface'
import { clone } from '../../util'

/** Create and parse rich message content. */
export class Payload {
  attachments?: IAttachment[]
  actions?: IAction[]
  quickReplies?: IQuickReply[]
  [key: string]: any

  /** Create a new payload instance. */
  constructor ({ attachments, actions, quickReplies }: {
    attachments?: IAttachment[]
    actions?: IAction[]
    quickReplies?: IQuickReply[]
  } = {}) {
    if (attachments) for (let i of attachments) this.attachment(i)
    if (actions) for (let i of actions) this.action(i)
    if (quickReplies) for (let i of quickReplies) this.quickReply(i)
  }

  /** Add any custom attributes / JSON to a message. */
  custom (object: any) {
    for (let key in object) this[key] = object[key]
    return this
  }

  /** Add an attachment to the payload. */
  attachment (attachment: IAttachment) {
    if (!this.attachments) this.attachments = []
    this.attachments.push(attachment)
    return this
  }

  /** Add an action button to the payload. */
  action (action: IAction) {
    if (!this.actions) this.actions = []
    this.actions.push(action)
    return this
  }

  /** Add a quick reply button to the payload. */
  quickReply (quickReply: IQuickReply) {
    if (!quickReply.type) quickReply.type = 'button'
    if (!quickReply.content) quickReply.content = quickReply.text
    if (!this.quickReplies) this.quickReplies = []
    this.quickReplies.push(quickReply)
    return this
  }

  /** Get the payload as a plain object. */
  toObject () {
    return clone(this)
  }
}
