import { IAttachment, IAction, IQuickReply } from './interface'
import { Payload } from './class'

/** Helpers to create payload instances. */
export class PayloadController {
  /** Create a payload, optionally populating content. */
  create (content?: {
    attachments?: IAttachment[]
    actions?: IAction[]
    quickReplies?: IQuickReply[]
  }) {
    return new Payload(content)
  }

  /** Create a custom payload. */
  custom (object: any) {
    this.create().custom(object)
  }
}
