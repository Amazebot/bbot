import { counter } from '../utils/id'

/**
 * @module room
 * Represents rooms in messaging platform.
 */

/** Room instance attributes. */
export interface IRoom {
  id?: string
  name?: string
  type?: string
  [key: string]: any
}

/** A room in messaging platform. */
export class Room implements IRoom {
  id: string = ''
  name?: string
  type?: string
  [key: string]: any

  /** Create a room. */
  constructor (meta: IRoom = {}) {
    Object.keys(meta).forEach((key: string) => this[key] = meta[key])
    if (!this.id || this.id === '') this.id = counter('room')
    if (!this.name) this.name = this.id
  }
}
