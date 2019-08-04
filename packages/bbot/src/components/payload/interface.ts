/** Generic schema for attaching image, audio or video with meta. */
export interface IAttachment {
  /** Plain-text summary of the attachment */
  fallback?: string
  /** Hex code (messaging platform support may vary) */
  color?: string
  /** Initially display as collapsed or expended */
  collapsed?: boolean
  /** Text that appears above the attachment block */
  pretext?: string
  /** Title of the attachment object */
  title?: IRichText
  /** Text to append after object, with icon or link */
  footer?: IRichText
  /** Text that appears within the attachment */
  description?: string
  /** Credit for attachment source */
  author?: IAuthor
  /** URL for image thumbnail */
  thumbUrl?: string
  /** URL for full image attachment */
  image?: string
  /** URL for audio attachment */
  audio?: string
  /** URL for video attachment */
  video?: string
  /** Additional custom meta fields */
  fields?: IAttachmentField[]
  /** Allow custom attributes */
  [key: string]: any
}

/** Author / source attributes for attachments. */
export interface IAuthor {
  /** Name of source */
  name: string
  /** Link to profile / bio */
  link?: string
  /** Avatar or user icon */
  icon?: string
}

/** Support text with additional styling and utility. */
export interface IRichText {
  /** Text */
  text: string
  /** Link URL */
  link?: string
  /** Icon URL */
  icon?: string
}

/** Additional custom meta fields for attachments. */
export interface IAttachmentField {
  /** Detail name */
  short?: boolean
  /** Detail summary */
  title: string
  /** Detail value */
  value: string
}

/** Rich message actions, support dependent on messaging platform. */
export interface IAction {
  /** Action ID (known to messaging platform) */
  name: string
  /** Type of action */
  type: string
  /** Text to display */
  text: string
  /** Visual class (e.g. primary, danger) */
  style?: string
  /** Custom data value to assign to action event */
  value?: string
  /** Action confirmation meta */
  confirm?: IConfirm
  /** Allow custom attributes */
  [key: string]: any
}

/** Field schema for actions with confirmation. */
export interface IConfirm {
  /** Header text */
  title?: string
  /** Confirmation description */
  text?: string
  /** Confirm button text */
  ok: string
  /** Cancel button text */
  dismiss: string
  /** Allow custom attributes */
  [key: string]: any
}

/** Rich message quick reply button, support depends on messaging platform. */
export interface IQuickReply {
  /** Button display text */
  text: string
  /** Type of content (text, phone, email, location) */
  type?: string
  /** Value to submit if clicked */
  content?: any
  /** URL to deliver users to on click */
  url?: string
  /** Button image URL */
  image?: string
  /** Allow custom attributes */
  [key: string]: any
}
