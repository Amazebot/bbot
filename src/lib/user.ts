import { id, room } from '..'

/** @todo Put in namespace, add .create and .random methods */

/** User instance attributes. */
export interface IUser {
  id?: string
  room?: room.IRoom
  name?: string
  [key: string]: any
}

/** A user in the chat. */
export class User implements IUser {
  id: string = ''
  room: room.IRoom = room.blank()
  name?: string
  [key: string]: any

  /** Create a User */
  constructor (meta: IUser = {}) {
    Object.keys(meta).forEach((key: string) => this[key] = meta[key])
    if (!this.id || this.id === '') this.id = id.counter('user')
    if (!this.name) this.name = this.id
  }
}
