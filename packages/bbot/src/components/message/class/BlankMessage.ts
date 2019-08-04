/** @dodo delete + create a normal message from message and user controller */

import { Message } from '.'

/** An empty message for outgoings without original input */
export class BlankMessage extends Message {
  constructor () {
    super(new User())
  }
  toString () { return '' }
}
