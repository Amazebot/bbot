/**
 * Represent users in a chat platform (and/or external DB).
 * @module components/user
 */

import { Bot } from '../../bot'
import { User } from './class'
import { UserController } from './controller'

export function makeUserController (bot: Bot) {
  return new UserController({
    putUser: (user: User) => bot.memory.users[user.id] = user,
    getUser: (id: string) => bot.memory.users[id],
    getUsers: () => Object.values(bot.memory.users)
  })
}
