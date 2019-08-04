import { Room } from './class'
import { counter, random } from '../../util'

/** Create and retrieve rooms. */
export class RoomController {
  /** Create room controller, accepting dependencies. */
  constructor (private _: {
    putRoom: (user: Room) => void,
    getRoom: (id: string) => Room
  }) {}

  /** Create a room, populated attributes from meta. */
  create = (options: {
    id?: string
    name?: string
    type?: string
    [key: string]: any
  } = {}) => {
    let { id, name, type, ...meta } = options
    if (!id) id = counter('room')
    if (!name) name = id
    return new Room({ id, name, type, meta })
  }

  /** Create a room with a random ID. */
  random = () => this.create({ id: random() })

  /** Create a room without an ID (id === 'room'). */
  blank = () => this.create({ id: 'null-room' })

  /**
   * Get a room by ID from memory.
   * If found and given meta, updates and returns updated room.
   * If given meta and ID not found, creates new room.
   */
  byId (id: string, meta?: any) {
    let saved = this._.getRoom(id)
    const updated = Object.assign({}, { id }, saved, meta)
    const room = this.create(updated)
    this._.putRoom(room)
    return room
  }
}

export default RoomController
