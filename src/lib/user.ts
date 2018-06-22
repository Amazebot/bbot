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
  constructor (meta?: IUser) {
    this.id = (meta && meta.id) ? meta.id : bot.random()
    if (meta) Object.keys(meta).forEach((key: string) => this[key] = meta[key])
    this.room = (meta && meta.room) ? meta.room : {}
    if (!this.name) this.name = this.id
  }
}
