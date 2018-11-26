import { id } from '..'

/** Represents rooms in messaging platform. */
export namespace room {

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
      if (!this.id || this.id === '') this.id = id.counter('room')
      if (!this.name) this.name = this.id
    }
  }

  /** Create a room, populated attributes from meta. */
  export const create = (meta: IRoom = {}) => new Room(meta)

  /** Create a room with a random ID. */
  export const random = () => create({ id: id.random() })

  /** Create a room without an ID (id === 'room'). */
  export const blank = () => create({ id: 'room' })
}
