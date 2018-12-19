/**
 * Represents rooms in a chat platform (and/or external DB).
 * @module components/user
 */

import { random, counter } from '../util/id'
import { rooms, Room, IRoom } from './room'
import { memory } from './memory'

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

/** Create and restore users from memory */
export class UserController {
  /** Create a user, populated attributes from options. */
  create = (options: IUser = {}) => new User(options)

  /** Create a user with a random ID. */
  random = () => this.create({ id: random() })

  /** Create a blank user with null ID. */
  blank = () => this.create({ id: 'null-user' })

  /**
   * Get a user by ID from memory.
   * If found and given options, updates and returns updated user.
   * If given options and ID not found, creates new user.
   */
  byId (id: string, options?: any) {
    let saved = memory.users[id]
    const updated = Object.assign({}, { id }, saved, options)
    const user = new User(updated)
    memory.users[id] = user
    return user
  }

  /** Get users by their name. */
  byName (name: string) {
    let users: User[] = []
    for (let id in memory.users) {
      let user: User = memory.users[id]
      if (user.name && user.name.toLowerCase() === name.toLowerCase()) {
        users.push(user)
      }
    }
    return users
  }
}

export const users = new UserController()

export default users
