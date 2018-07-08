import { Adapter } from './base'
import * as bBot from '../..'

/** NLU adapter class, extended to connect bBot with NLU platform. */
export abstract class LanguageAdapter extends Adapter {
  name = 'language-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Take message to add NLU attributes from platform response */
  abstract async process (message: bBot.TextMessage): Promise<any>
}
