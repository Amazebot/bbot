import { id, room, memory } from '..'

/** Create and restore users from memory */
export namespace user {

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
    room: room.Room
    name?: string
    [key: string]: any

    /** Create a User (creates ID and room if not given in meta) */
    constructor (meta: IUser = {}) {
      Object.keys(meta).forEach((key: string) => this[key] = meta[key])
      this.room = (!meta.room) ? room.blank() : room.create(meta.room)
      if (!this.id || this.id === '') this.id = id.counter('user')
      if (!this.name) this.name = this.id
    }
  }

  /** Create a user, populated attributes from meta. */
  export const create = (meta: IUser = {}) => new User(meta)

  /** Create a user with a random ID. */
  export const random = () => create({ id: id.random() })

  /**
   * Get a user by ID from memory.
   * If found and given meta, updates and returns updated user.
   * If given meta and ID not found, creates new user.
   */
  export function byId (id: string, meta?: any) {
    let saved = memory.users[id]
    const updated = Object.assign({}, { id }, saved, meta)
    const user = new User(updated)
    memory.users[id] = user
    return user
  }

  /** Get users by their name. */
  export function byName (name: string) {
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
