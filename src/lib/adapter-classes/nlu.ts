import { Adapter } from './base'
import * as bot from '../..'

/** NLU adapter class, extended to connect bBot with NLU platform. */
export abstract class NLUAdapter extends Adapter {
  name = 'nlu-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Add NLU results from NLP platform analysis */
  abstract process (message: bot.TextMessage): Promise<bot.NaturalLanguageResultsRaw | undefined>
}
