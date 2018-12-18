import logger from './logger'
import { BranchController } from './branches'
import dialogues from './dialogues'
import { IContext } from './server'
import { State } from '../components/state'
import { Thoughts } from '../components/thought'
import { Message, Envelope, ServerMessage } from '../components'

/** Entry points to thought processes. */
export class ThoughtController {
  /** Create a new thought process. */
  create = (b: State, branches?: BranchController) => new Thoughts(b, branches)

  /**
   * Initiate sequence of thought processes for an incoming message.
   * Branch callbacks may also respond. Final state is remembered.
   *
   * If audience is engaged in dialogue, use the isolated dialogue path instead of
   * default "global" path. The dialogue path is then progressed to a clean path,
   * to allow adding a new set of branches upon matching the current ones.
   * If no branches matched, no new branches would be added to the new path, so
   * we revert to the previous path (the one that was just processed). If branches
   * matched, but no additional branches added, close the dialogue.
   */
  async receive (message: Message, branches?: BranchController) {
    logger.info(`[thought] receive message ID ${message.id}`)
    const startingState = new State({ message })
    const dlg = dialogues.engaged(startingState)
    if (dlg && !branches) branches = dlg.progressBranches()
    const thought = this.create(startingState, branches)
    const finalState = await thought.start('receive')
    if (dlg) {
      if (!finalState.matched) dlg.revertBranches()
      else if (dlg.branches.exist()) await dlg.close()
    }
    return finalState
  }

  /**
   * Initiate a response from an existing state. Sequence does not remember
   * because it will usually by triggered from within the `receive` sequence.
   */
  async respond (b: State) {
    if (!b.branch) logger.info(`[thought] respond without matched branch`)
    else logger.info(`[thought] respond to matched branch ${b.branch.id}`)
    return this.create(b).start('respond')
  }

  /**
   * Initiate chain of thought processes for an outgoing envelope.
   * This is for sending unprompted by a branch. Final state is remembered.
   */
  async dispatch (envelope: Envelope) {
    logger.info(`[thought] dispatch envelope ${envelope.id}`)
    return this.create(new State({ envelopes: [envelope] })).start('dispatch')
  }

  /** Initiate chain of thought processes for responding to a server request. */
  async serve (
    message: ServerMessage,
    context: IContext,
    branches?: BranchController
  ) {
    logger.info(`[thought] serving ${message.id} for ${message.user.id}`)
    return this.create(new State({ message, context }), branches).start('serve')
  }
}

export const thoughts = new ThoughtController()

export default thoughts
