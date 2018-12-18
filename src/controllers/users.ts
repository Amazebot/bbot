import { random } from '../utils/id'
import { User, IUser } from '../components/user'
import memory from '../controllers/memory'

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
