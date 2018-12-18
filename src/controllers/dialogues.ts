import { Dialogue } from '../components/dialogue'
import { State } from '../components/state'

/** Track and interact with current dialogues and engaged participants. */
export class DialogueController {
  /** Collection of open current assigned to their audience ID. */
  current: { [id: string]: Dialogue } = {}

  /** Stop timers and clear collection of current (for tests) */
  reset () {
    for (let id in this.current) {
      this.current[id].stopClock()
      delete this.current[id]
    }
  }

  /** Get set of possible audience IDs for a given  */
  audiences (b: State) {
    return {
      direct: `${b.message.user.id}_${b.message.user.room.id}`,
      user: `${b.message.user.id}`,
      room: `${b.message.user.room.id}`
    }
  }

  /** Check if audience ID has an open dialogue. */
  audienceEngaged (id: string) {
    return (Object.keys(this.current).indexOf(id) > -1)
  }

  /** Get the ID of engaged audience from current state (if any). */
  engagedId (b: State) {
    const audienceIds = this.audiences(b)
    if (this.audienceEngaged(audienceIds.direct)) return audienceIds.direct
    else if (this.audienceEngaged(audienceIds.user)) return audienceIds.user
    else if (this.audienceEngaged(audienceIds.room)) return audienceIds.room
  }

  /** Find an open dialogue from state for any possibly engaged audience. */
  engaged (b: State) {
    const audienceId = this.engagedId(b)
    if (audienceId) return this.current[audienceId]
  }

  /** Add an audience from state to a given dialogue. */
  engage (b: State, dialogue: Dialogue) {
    const audienceId = this.audiences(b)[dialogue.audience]
    this.current[audienceId] = dialogue
  }

  /** Remove the audience from any dialogue or a given dialogue. */
  disengage (b: State, dialogue?: Dialogue) {
    const audienceId = (dialogue)
      ? this.audiences(b)[dialogue.audience]
      : this.engagedId(b)
    if (audienceId) delete this.current[audienceId]
  }
}

export const dialogues = new DialogueController()

export default dialogues
