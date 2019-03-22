const { bBot } = require('bbot')

// Text branch. Say > Hello bots.
bBot.branches.text(/(hi|hello) bots/i, (b) => b.respond('Hello 👋'))

// Text branch. Say > Hello world.
bBot.branches.text({
  starts: 'hello',
  contains: 'world'
}, (b) => b.respond('Hello you!'))

// Catch branch. Say anything other than "match".
bBot.branches.text(/match/i, (b) => b.respond('Input matched'))
bBot.branches.catchAll((b) => b.respond('Input did not match'))

// Text branch with dialogue. Say > Help? > Yes/No
bBot.branches.text({ starts: 'help' }, (b) => {
  b.branches.text({ is: 'yes' }, (b) => 'OK, I will try...')
  b.branches.text({ is: 'no' }, (b) => 'OK, never mind.')
  b.branches.catchAll((b) => 'Sorry, just say "yes" or "no"')
  return b.respond('Need some help?')
})

bBot.start()
