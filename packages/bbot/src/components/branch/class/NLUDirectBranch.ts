/** Natural Language Direct Branch pre-matches the text for bot name prefix. */
export class NLUDirectBranch extends NLUBranch {
  processKey: ProcessKeys = 'understand'

  async matcher (msg: TextMessage) {
    if (directPattern().exec(msg.toString())) {
      return super.matcher(msg)
    } else {
      return undefined
    }
  }
}
