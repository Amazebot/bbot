import * as id from '../utils/id'
import { Room, IRoom } from '../components/room'
import memory from './memory'

/** Create and retrieve rooms. */
export class RoomController {
  /**
   * Get a room by ID from memory.
   * If found and given meta, updates and returns updated room.
   * If given meta and ID not found, creates new room.
   */
  byId (id: string, meta?: any) {
    let saved = memory.rooms[id]
    const updated = Object.assign({}, { id }, saved, meta)
    const room = new Room(updated)
    memory.rooms[id] = room
    return room
  }

  /** Create a room, populated attributes from meta. */
  create = (meta: IRoom = {}) => new Room(meta)

  /** Create a room with a random ID. */
  random = () => this.create({ id: id.random() })

  /** Create a room without an ID (id === 'room'). */
  blank = () => this.create({ id: 'room' })
}

export const rooms = new RoomController()

export default rooms
