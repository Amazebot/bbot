/**
 * Represents rooms in a chat platform.
 * @module components/room
 */

import { Bot } from '../../bot'
import { Room } from './class'
import { RoomController } from './controller'

export function makeUserController (bot: Bot) {
  return new RoomController({
    putRoom: (room: Room) => bot.memory.rooms[room.id] = room,
    getRoom: (id: string) => bot.memory.rooms[id]
  })
}
