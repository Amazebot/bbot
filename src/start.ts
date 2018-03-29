/**
 * @module start
 * Starts the bbot immediately without params, returning a promise that resolves
 * with the main module. Can be required as `'bbot/start'` or executed as a
 * script directly from command line.
 */

import * as bbot from './index'
module.exports = bbot.start().then(() => bbot)
