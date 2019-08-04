/** A user in the chat. */
export class User {
  id: string
  name: string
  [key: string]: any

  /** Create a User (creates ID and room if not given in meta) */
  constructor (props: {
    id: string,
    name: string,
    meta?: { [key: string]: any }
  }) {
    this.id = props.id
    this.name = props.name
    const meta = props.meta || {}
    Object.keys(meta).forEach((key: string) => this[key] = meta[key])
  }
}
