import { random } from '..'

/** Represents a participating user in the chat. */
export class User {
  [key: string]: any;
  /**
   * Create a User
   * @param id    A unique ID for the user, randomly generated if not given
   * @param meta  Key/value pairs of extra data to assign as instance attributes
   */
  constructor (public id: string = random(), meta?: { [key: string]: any }) {
    if (meta) Object.keys(meta).forEach((key: string) => this[key] = meta[key])
    if (!this.name) this.name = this.id
  }
}
