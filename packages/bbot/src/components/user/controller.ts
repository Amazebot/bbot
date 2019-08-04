import { User } from './class'
import { counter, random } from '../../util'

/** Create and restore users from memory */
export class UserController {
  /** Create user controller, accepting dependencies. */
  constructor (private _: {
    putUser: (user: User) => void,
    getUser: (id: string) => User,
    getUsers: () => User[]
  }) {}

  /** Create a user, populated attributes from options. */
  create = (options: {
    id?: string
    name?: string
    [key: string]: any
  } = {}) => {
    let { id, name, ...meta } = options
    if (!id) id = counter('user')
    if (!name) name = id
    return new User({ id, name, meta })
  }

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
    let saved = this._.getUser(id)
    const updated = Object.assign({}, { id }, saved, options)
    const user = this.create(updated)
    this._.putUser(user)
    return user
  }

  /** Get users by their name. */
  byName (name: string) {
    let users: User[] = []
    for (let user of this._.getUsers()) {
      if (user.name && user.name.toLowerCase() === name.toLowerCase()) {
        users.push(user)
      }
    }
    return users
  }
}

export default UserController
