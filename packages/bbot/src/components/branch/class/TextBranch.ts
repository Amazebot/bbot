import { Branch, IBranchProps } from './Branch'
import { ProcessKeys } from '../interface'
import { Message } from '../../message/class'
import { Conditions } from '../../condition/class'

export interface ITextBranchProps extends IBranchProps {
  conditions: Conditions
}

/** Text branch uses basic regex or condition instance matching */
export class TextBranch extends Branch {
  processKey: ProcessKeys = 'listen'
  conditions: Conditions

  /** Create text branch for regex pattern */
  constructor ({ conditions, ...props }: ITextBranchProps) {
    super(props)
    this.conditions = conditions
  }

  /**
   * Match message text against regex or composite conditions.
   * Resolves with either single match result or cumulative condition success.
   */
  async matcher (msg: Message) {
    this.conditions.exec(msg.toString())
    return this.conditions.match
  }
}
    // if (match) {
    //   logger.debug(`[branch] message "${msg.toString()}" matched branch ${this.id} conditions`)
    // }
    // return match
