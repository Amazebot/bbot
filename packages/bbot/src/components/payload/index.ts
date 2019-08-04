/**
 * Handle storing and parsing rich message content for chat platforms.
 * @module components/payload
 */

import { PayloadController } from './controller'

export function makePayloadController () {
  return new PayloadController()
}
