'use strict'

const { bBot } = require('bbot')

// Text branch. Say > Hello bots!
bBot.branches.text({ contains: 'bots' }, (b) => {
  return b.respond(`Hello @${b.message.user.name} 👋`)
})

// Direct branch. In a DM or after mentioning bot, say > Who are you?
bBot.branches.direct({ contains: 'who' }, (b) => {
  const name = bBot.config.get('name')
  const alias = bBot.config.get('alias')
  return b.respond(`My name is ${name}. I also respond to @${alias}`)
})

// Custom branch. Post an image attachment.
bBot.branches.custom((message) => {
  return (message.payload && message.payload.attachments)
}, (b) => {
  return b.respond('Nice attachments you got there.')
})

// Respond with attachment. Directly say > Attach something.
bBot.branches.direct(/attach/i, (b) => {
  const image = 'https://github.com/Amazebot/bbot/blob/WIP/assets/avatar.png'
  b.envelope.attach({ image })
  return b.respond()
})

// Attach quick replies, continue dialogue in context. Say > I want a prize.
bBot.branches.text({ contains: 'prize' }, (b) => {
  b.envelope.write('Choose your fate! 🚪... 🎁 ')
  b.envelope.attach({ color: '#f4426e' })
  b.envelope.payload
    .quickReply({ text: 'Door number 1' })
    .quickReply({ text: 'Door number 2' })
    .quickReply({ text: 'Door number 3' })
  b.branches.text({ after: 'door', range: '1-3' }, (b) => {
    b.respond(`You chose door ${b.match.captured}`)
  })
  return b.respond()
})

bBot.start()
