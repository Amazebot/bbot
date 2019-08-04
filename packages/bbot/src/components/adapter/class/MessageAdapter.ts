import { Adapter } from '.'
import { Envelope } from '../..'

/** Message Adapter class, extended to connect bBot with messaging platform. */
export abstract class MessageAdapter extends Adapter {
  name = 'message-adapter'

  /** Open connection to messaging platform */
  abstract start (): Promise<void>

  /** Close connection to messaging platform */
  abstract shutdown (): Promise<void>

  /** Take dispatched envelope to action in platform */
  abstract dispatch (envelope: Envelope): Promise<any>
}
