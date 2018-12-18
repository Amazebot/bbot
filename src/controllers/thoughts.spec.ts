import states from './states'
import { State } from '../components/state'
import { Path } from './branches'
import { Thoughts } from '../components/thought'

/** Entry points to thought processes. */
export class ThoughtController {
  /** Create a new thought process. */
  create = (b: state.State, path?: path.Path) => new Thoughts(b, path)

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
  async receive (message: message.Message, path?: path.Path) {
    logger.info(`[thought] receive message ID ${message.id}`)
    const startingState = state.create({ message })
    const dlg = dialogue.engaged(startingState)
    if (dlg && !path) path = dlg.progressPath()
    const thought = create(startingState, path)
    const finalState = await thought.start('receive')
    if (dlg) {
      if (!finalState.matched) dlg.revertPath()
      else if (dlg.path.hasBranches()) await dlg.close()
    }
    return finalState
  }

  /**
   * Initiate a response from an existing state. Sequence does not remember
   * because it will usually by triggered from within the `receive` sequence.
   */
  async respond (b: state.State) {
    if (!b.branch) logger.info(`[thought] respond without matched branch`)
    else logger.info(`[thought] respond to matched branch ${b.branch.id}`)
    return create(b).start('respond')
  }

  /**
   * Initiate chain of thought processes for an outgoing envelope.
   * This is for sending unprompted by a branch. Final state is remembered.
   */
  async dispatch (envelope: envelope.Envelope) {
    logger.info(`[thought] dispatch envelope ${envelope.id}`)
    return create(state.create({ envelopes: [envelope] })).start('dispatch')
  }

  /** Initiate chain of thought processes for responding to a server request. */
  async serve (
    msg: message.Server,
    ctx: server.IContext,
    pth?: path.Path
  ) {
    logger.info(`[thought] serving ${msg.id} for ${msg.user.id}`)
    return create(state.create({ msg, ctx }), pth).start('serve')
  }
}

export const thoughts = new ThoughtController()

export default thoughts
