'use strict'

const { bBot } = require('bbot')
const { headerLog } = require('../util')

// ⚠️ only for example output - do no copy!
headerLog({
  name: 'Rocket.Chat message adapter (basic)',
  configs: {
    'RC_URL': 'localhost:3000',
    'RC_USERNAME': 'admin',
    'RC_PASSWORD': 'password'
  }
})

// 🤖 bBot initialisation (with adapter config)
bBot.config.set('server-port', 3003) // avoid RC localhost conflict
bBot.config.set('message-adapter', 'bbot-message-rocketchat')
bBot.start()
