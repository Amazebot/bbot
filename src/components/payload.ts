/** Payloads add consistent and intelligent typing to rich messages. */
export interface IPayload {
  attachments?: IAttachment[]
  actions?: IAction[]
  quickReplies?: IQuickReply[]
}

/** Generic schema for attaching image, audio or video with meta. */
export interface IAttachment {
  [key: string]: any           // Allow custom attributes
  fallback: string             // Required plain-text summary of the attachment
  color?: string               // Hex code (messaging platform support may vary)
  collapsed?: boolean          // Initially display as collapsed or expended
  pretext?: string             // Text that appears above the attachment block
  title?: IRichText            // Title of the attachment object
  footer?: IRichText           // Text to append after object, with icon or link
  description?: string         // Text that appears within the attachment
  author?: IAuthor             // Credit for attachment source
  thumbUrl?: string            // URL for image thumbnail
  image?: string               // URL for full image attachment
  audio?: string               // URL for audio attachment
  video?: string               // URL for video attachment
  fields?: IAttachmentField[]  // Additional custom meta fields
}

/** Author / source attributes for attachments. */
export interface IAuthor {
  name: string                 // Name of source
  link?: string                // Link to profile / bio
  icon?: string                // Avatar or user icon
}

/** Support text with additional styling and utility. */
export interface IRichText {
  text: string                 // Text
  link?: string                // Link URL
  icon?: string                // Icon URL
}

/** Additional custom meta fields for attachments. */
export interface IAttachmentField {
  short?: boolean              // Detail name
  title: string                // Detail summary
  value: string                // Detail value
}

/** Rich message actions, support dependent on messaging platform. */
export interface IAction {
  [key: string]: any           // Allow custom attributes
  name: string                 // Action ID (known to messaging platform)
  type: string                 // Type of action
  text: string                 // Text to display
  style?: string               // Visual class (e.g. primary, danger)
  value?: string               // Custom data value to assign to action event
  confirm?: IConfirm           // Action confirmation meta
}

/** Field schema for actions with confirmation. */
export interface IConfirm {
  [key: string]: any           // Allow custom attributes
  title?: string               // Header text
  text?: string                // Confirmation description
  ok: string                   // Confirm button text
  dismiss: string              // Cancel button text
}

/** Rich message quick reply button, support depends on messaging platform. */
export interface IQuickReply {
  [key: string]: any           // Allow custom attributes
  text: string                 // Button display text
  type?: string                // Type of content (text, phone, email, location)
  content?: any                // Value to submit if clicked
  url?: string                 // URL to deliver users to on click
  image?: string               // Button image URL
}

/** Create and parse rich message content. */
export class Payload implements IPayload {
  attachments?: IAttachment[]
  actions?: IAction[]
  quickReplies?: IQuickReply[]
  [key: string]: any

  /** Create a new payload instance. */
  constructor (options: IPayload = {}) {
    if (options.attachments) for (let i of options.attachments) this.attachment(i)
    if (options.actions) for (let i of options.actions) this.action(i)
    if (options.quickReplies) for (let i of options.quickReplies) this.quickReply(i)
  }

  /** Add any custom attributes / JSON to a message. */
  custom (object: any) {
    for (let key in object) this[key] = object[key]
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
  toObject (): IPayload {
    return JSON.parse(JSON.stringify(this))
  }
}
