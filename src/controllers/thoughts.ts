import logger from './logger'
import { BranchController } from './branches'
import { IContext } from './server'
import * as message from '../components/message'
import * as state from '../components/state'
import * as envelope from '../components/envelope'
import * as dialogue from '../components/dialogue'
import { Thoughts } from '../components/thought'

/** Control creation of through processes for incoming/outgoing sequences. */
export class ThoughtController {
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
  async receive (message: message.Message, branches?: BranchController) {
    logger.info(`[thought] receive message ID ${message.id}`)
    const startingState = state.create({ message })
    const dlg = dialogue.engaged(startingState)
    if (dlg && !branches) branches = dlg.progressBranches()
    const thought = new Thoughts(startingState, branches)
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
  async respond (b: state.State) {
    if (!b.matchingBranch()) logger.info(`[thought] respond without matched branch`)
    else logger.info(`[thought] respond to matched branch ${b.matchingBranch()!.id}`)
    return new Thoughts(b).start('respond')
  }

  /**
   * Initiate chain of thought processes for an outgoing envelope.
   * This is for sending unprompted by a branch. Final state is remembered.
   */
  async dispatch (envelope: envelope.Envelope) {
    logger.info(`[thought] dispatch envelope ${envelope.id}`)
    return new Thoughts(state.create({ envelopes: [envelope] })).start('dispatch')
  }

  /** Initiate chain of thought processes for responding to a server request. */
  async serve (
    msg: message.Server,
    ctx: IContext,
    branches?: BranchController
  ) {
    logger.info(`[thought] serving ${msg.id} for ${msg.user.id}`)
    return new Thoughts(state.create({ msg, ctx }), branches).start('serve')
  }
}

export const thoughts = new ThoughtController()

export default thoughts
