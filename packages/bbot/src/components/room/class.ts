/** A room in messaging platform. */
export class Room {
  id: string = ''
  name?: string
  type?: string
  [key: string]: any

  /** Create a room. */
  constructor (props: {
    id: string,
    name: string,
    type?: string,
    meta?: { [key: string]: any }
  }) {
    this.id = props.id
    this.name = props.name
    const meta = props.meta || {}
    Object.keys(meta).forEach((key: string) => this[key] = meta[key])
  }
}
