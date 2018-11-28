import { id, room, memory } from '.'

/** Create and restore users from memory */
export namespace user {

  /** User instance attributes. */
  export interface IOptions {
    id?: string
    room?: room.IRoom
    name?: string
    [key: string]: any
  }

  /** A user in the chat. */
  export class User implements IOptions {
    id: string = ''
    room: room.Room
    name?: string
    [key: string]: any

    /** Create a User (creates ID and room if not given in options) */
    constructor (options: IOptions = {}) {
      Object.keys(options).forEach((key: string) => this[key] = options[key])
      this.room = (!options.room) ? room.blank() : room.create(options.room)
      if (!this.id || this.id === '') this.id = id.counter('user')
      if (!this.name) this.name = this.id
    }
  }

  /** Create a user, populated attributes from options. */
  export const create = (options: IOptions = {}) => new User(options)

  /** Create a user with a random ID. */
  export const random = () => create({ id: id.random() })

  /** Create a blank user with null ID. */
  export const blank = () => create({ id: 'null-user' })

  /**
   * Get a user by ID from memory.
   * If found and given options, updates and returns updated user.
   * If given options and ID not found, creates new user.
   */
  export function byId (id: string, options?: any) {
    let saved = memory.users[id]
    const updated = Object.assign({}, { id }, saved, options)
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
