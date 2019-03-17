const { bBot } = require('bbot')

// Text branch. Say > Hello bots.
bBot.branches.text(/(hi|hello) bots/i, (b) => b.respond('Hello 👋'))

bBot.start()
