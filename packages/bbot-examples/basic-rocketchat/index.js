'use strict'

const { bBot } = require('bbot')

// Text branch. Say > Hello bots!
bBot.branches.text({ contains: 'bots' }, (b) => b.respond(`Hello @${b.message.user.name} 👋`))

// Direct branch. In a DM or after mentioning bot, say > Who are you?
bBot.branches.direct({ contains: 'who' }, (b) => {
  const name = bBot.config.get('name')
  const alias = bBot.config.get('alias')
  b.respond(`My name is ${name}, but I also respond to ${alias} or @${alias}`)
})

// Custom branch. Post an image attachment.
bBot.branches.custom((message) => {
  return (message.payload && message.payload.attachments)
}, (b) => {
  return b.respond('Nice attachments you got there.')
})

// Respond with attachment. Directly say > Attach something.
bBot.branches.direct(/attach/i, (b) => {
  b.envelope.attach({ image: 'https://raw.githubusercontent.com/Amazebot/bbot-rocketchat-boilerplate/master/img/avatar.png' })
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
  b.branches.text({ contains: 'door' }, (b) => {
    b.respond(`You chose door ${b.message.text.match(/\d/)[0]}.`)
  })
  return b.respond()
})

bBot.start()
