'use strict'

const { bBot } = require('bbot')

// Text branch. Say > I want a prize.
bBot.branches.text({ contains: 'prize' }, (b) => {
  b.envelope.write('Choose your fate! 🚪... 🎁 ')
  b.envelope.attach({ color: '#f4426e' })
  b.envelope.payload
    .quickReply({ text: 'Door number 1' })
    .quickReply({ text: 'Door number 2' })
    .quickReply({ text: 'Door number 3' })
  b.branches.text({ starts: 'Door' }, (b) => {
    return b.respond('```' + b.inspect() + '```')
  })
  return b.respond()
})

bBot.start()
