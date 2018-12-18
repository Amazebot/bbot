import { Envelope, IEnvelope } from '../components/envelope'

/** Access envelopes constructor. */
export class EnvelopeController {
  create = (atts?: IEnvelope) => new Envelope(atts)
}

export const envelopes = new EnvelopeController()

export default envelopes
