// NB: This is a draft spec, expect lots to change before schema is complete.
// Current draft is based on Rocket.Chat and Slack schemas, due to crossover.

/** Payloads add consistent and intelligent typing to rich messages */
export interface IPayload {
  attachments?: IAttachment[]
  actions?: IAction[]
  quickReplies?: IQuickReply[]
}

/** Generic schema for attaching image, audio or video with meta */
export interface IAttachment {
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

/** Author / source attributes for attachments */
export interface IAuthor {
  name: string                 // Name of source
  link?: string                // Link to profile / bio
  icon?: string                // Avatar or user icon
}

/** Support text with additional styling and utility */
export interface IRichText {
  text: string                 // Text
  link?: string                // Link URL
  icon?: string                // Icon URL
}

/** Additional custom meta fields for attachments */
export interface IAttachmentField {
  short?: boolean              // Detail name
  title: string                // Detail summary
  value: string                // Detail value
}

/** Rich message actions, support dependent on messaging platform */
export interface IAction {
  name: string                 // Action ID (known to messaging platform)
  type: string                 // Type of action
  text: string                 // Text to display
  style?: string               // Visual class (e.g. primary, danger)
  value?: string               // Custom data value to assign to action event
  confirm?: IConfirm           // Action confirmation meta
}

/** Field schema for actions with confirmation */
export interface IConfirm {
  title?: string               // Header text
  text?: string                // Confirmation description
  ok: string                   // Confirm button text
  dismiss: string              // Cancel button text
}

/** Rich message quick reply button, support dependent on messaging platform */
export interface IQuickReply {
  type?: string                // Type of content (text, phone, email, location)
  text: string                 // Button display text
  content: any                 // Value to submit if clicked
  image?: string               // Button image URL
}

/** Payload class provides helpers for sub-object creation */
export class Payload implements IPayload {
  attachments?: IAttachment[]
  actions?: IAction[]
  quickReplies?: IQuickReply[]

  /** Create a new payload instance */
  constructor (meta: IPayload = {}) {
    if (meta.attachments) for (let i of meta.attachments) this.attachment(i)
    if (meta.actions) for (let i of meta.actions) this.action(i)
    if (meta.quickReplies) for (let i of meta.quickReplies) this.quickReply(i)
  }

  /** Add an attachment to the payload */
  attachment (attachment: IAttachment) {
    if (!this.attachments) this.attachments = []
    this.attachments.push(attachment)
  }

  /** Add an action button to the payload */
  action (action: IAction) {
    if (!this.actions) this.actions = []
    this.actions.push(action)
  }

  /** Add a quick reply button to the payload */
  quickReply (quickReply: IQuickReply) {
    if (!this.quickReplies) this.quickReplies = []
    this.quickReplies.push(quickReply)
  }

  /** Get the payload as a plain object */
  toObject (): IPayload {
    return JSON.parse(JSON.stringify(this))
  }
}
