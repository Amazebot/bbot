/**
 * Text Direct Branch pre-matches the text for bot name prefix.
 * If matched on the direct pattern (name prefix) it runs the branch matcher on
 * a clone of the message with the prefix removed, this allows conditions like
 * `is` to operate on the body of the message, without failing due to a prefix.
 */
export class TextDirectBranch extends TextBranch {
  processKey: ProcessKeys = 'listen'

  async matcher (msg: TextMessage) {
    if (directPattern().exec(msg.toString())) {
      const indirectMessage = msg.clone()
      indirectMessage.text = msg.text.replace(directPattern(), '')
      return super.matcher(indirectMessage)
    } else {
      return false
    }
  }
}
