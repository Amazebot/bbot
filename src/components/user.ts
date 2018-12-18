import { counter } from '../utils/id'
import { Room, IRoom } from './room'
import rooms from '../controllers/rooms'

/** User instance attributes. */
export interface IUser {
  id?: string
  room?: IRoom
  name?: string
  [key: string]: any
}

/** A user in the chat. */
export class User implements IUser {
  id: string = ''
  room: Room
  name?: string
  [key: string]: any

  /** Create a User (creates ID and room if not given in meta) */
  constructor (meta: IUser = {}) {
    Object.keys(meta).forEach((key: string) => this[key] = meta[key])
    this.room = (meta.room && meta.room.id)
      ? rooms.byId(meta.room.id, meta.room)
      : rooms.blank()
    if (!this.id || this.id === '') this.id = counter('user')
    if (!this.name) this.name = this.id
  }
}
