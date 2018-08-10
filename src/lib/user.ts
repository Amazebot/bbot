import * as bot from '..'

/** Value of data to assign as user instance attributes */
export interface IUser {
  id?: string
  name?: string
  room?: {
    id?: string
    name?: string
  }
  [key: string]: any
}

/** Represents a participating user in the chat. */
export class User implements IUser {
  id: string
  room: {
    id?: string
    name?: string
    type?: string
  }
  name?: string
  [key: string]: any

  /** Create a User */
  constructor (meta: IUser = {}) {
    this.id = meta.id || bot.random()
    Object.keys(meta).forEach((key: string) => {
      if (typeof(meta[key] !== 'undefined') && meta[key] !== null) {
        this[key] = meta[key]
      }
    })
    this.room = (meta && meta.room) ? meta.room : {}
    if (!this.id) this.id = bot.random()
    if (!this.name) this.name = this.id
  }
}
