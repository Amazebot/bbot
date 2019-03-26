const { bBot, Conditions } = require('bbot')

// Capture variable request details, say >
// - Get me 100 coffees
// - Order 2 coffees for Otis
// - Order me a coffee please
const matcher = new Conditions()
  .add({ starts: ['order', 'get'] })
  .add({ contains: 'coffees?' }, 'plural')
const capture = new Conditions()
  .add({ contains: 'me' }, 'forSelf')
  .add({ range: '1-999' }, 'qty')
  .add({ ends: 'please' }, 'polite')
bBot.branches.text(matcher, (b) => {
  capture.exec(b.message.toString())
  // const { plural } = matcher.captures
  // const { forSelf, qty, polite } = capture.captures
  return b.respond('...')
    // JSON.stringify({ polite, plural, forSelf, qty })
}, { id: 'coffee-order' })

console.log(capture.expressions)
console.log(capture.exec('order me 2 coffees please'))
console.log(capture.captures)

// bBot.start()
