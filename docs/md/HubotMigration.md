[thought]: ./ThoughtProcess.md

Add note this a guide for script developers. To see a feature comparison, go here ... <LINK TO ENGINEERING SECTION>

Requiring/importing the bot...

Async all the things

Logging and error handling

Coffee -> ES2015 -> Typescript

^^^

## Hearing and Listening

`listen`, `hear` and `respond` methods have counterparts within bBot but they
work slightly differently and we've attempted to find more semantic naming.

### Hear ➡️ ListenText
- In **Hubot** `hear` adds a text pattern listener.
- In **bBot** `listenText` does the same, where `hear` is the [process][thought]
  which determines if incoming messages will be given to listeners.

### Respond ➡️ ListenDirect
- In **Hubot** `respond` add a text pattern listener that will only match if
  prefixed with the bot's name.
- In **bBot** `listenDirect` does the same.

### Listen ➡️ ListenCustom
- In **Hubot** `listen` is a sort of abstract for both `hear` and `respond`.
- In **bBot** `listen` is the [process][thought] which provides messages to each
listener. `listenCustom` can be used to create a listener with a custom matching
function.

### Example

Hubot
```js
module.exports = robot => robot.hear(/.*/, () => console.log('I hear!'))
```

bBot
```js
export default bot => bot.listenText(/.*/, () => console.log('I listen!'))
```

## Receive ➡️ Hear

In Hubot `hear` was used to setup a type of listener, which gets called after
`receiveMiddleware`. In bBot we use a naming style for the bot's thought process
that follows simple human terms. So `hear` has been purposed for the first stage
of that process. The `listenText` method is now the equivalent to Hubot `hear`.

### Example

Hubot
```js
const stream = require('my-amazing-integration')
stream.connect()
module.exports = robot => stream.on('event', () => {
  robot.receive(new robot.TextMessage({ id: 'system' }, 'Event fired'))
})
```

bBot
```js
import * as stream from 'my-amazing-integration'
stream.connect()
export default bot => stream.on('event', () => {
  bot.hear(new bot.TextMessage({ id: 'system' }, 'Event fired'))
})
```

## The Response Object vs B State

Hubot had a `Response` class that in bBot is roughly equivalent to `B`, because
in both it:
- contains properties about the current state of message processing
- is passed to listener callbacks
- provides methods to respond to a received message

The semantics for the response object in Hubot were sometimes misleading, as the
"response" did not always comprise an actual response and may never be used to
make one. It was more like a "context", though there was also a `context` in use
by middleware (which response was a property of) but the full context was not
available to higher level functions, like listeners.

In bBot, we've merged `context` and `response` into an all seeing state class
called `B`. So the same state flows through middleware, listeners and responses,
allowing callbacks to act with the full context of message processing history.

### Example

Hubot
```js
module.exports = robot => {
  robot.receiveMiddleware((context, next, done) => {
    console.log('Received: ' + context.response.message.toString())
    next()
  })
  robot.hear(/.*/, (response) => {
    console.log('Matched on: ' + JSON.stringify(response.match))
  }
}
```

bBot
```js
export default bot => {
  bot.hearMiddleware((b, next, done) => {
    console.log(`Received: ${b.message.toString()}`)
    next()
  })
  bot.listenText(/.*/, (b) => {
    console.log(`Matched on: ${JSON.stringify(b.match)}`)
  }
}
```

## Message Adapters and Response Methods

In Hubot, message adapters for different platforms often needed extending with
custom methods, but the base adapter class still attempted to define raw methods
for common cases. Some adapters did not even support all the defined methods.

bBot takes a different approach, the message adapter only has two methods,
`hear` and `respond`, for incoming and outgoing. `respond` is given the B state
instance, which includes a `method` property, to define a specific way for the
adapter to process the response. e.g. `method: 'reply'`, otherwise it defaults
to `send`. Then the adapter can handle as many or as few methods as it needs.

The outgoing state also includes an `envelope` property, with the  `room` and/or
`user` to address the message to, as well as the content (`strings` and/or
`payload`). This provides adapters a more flexible interface to create a variety
of message types within the chosen platform.

Composing and sending are also two distinct actions in bBot, to simplify writing
expressions for advanced callbacks, without complicated handling of arguments
(i.e. Hubot's tricky but confusing slicing of envelope and string arrays).
- `write` adds strings to an envelope
- `attach` adds a payload object to an envelope
- `compose` adds a mixed array of both of the above
- `respond` sends, with an optional method specified (defaults to 'send')

### Adapter Usage Example

Hubot
```js
module.exports = robot => {
  robot.hear(/hi$/, (res) => res.send('I heard someone!'))
  robot.hear(/hello\?$/, (res) => res.reply('I hear you!'))
  robot.hear(/sup$/, (res) => res.react(':wave:'))
}
```

bBot
```js
export default bot => {
  bot.listenText(/hi$/, (b) => b.write('I heard someone!').respond())
  bot.listenText(/hello\?$/, (b) => b.write('I hear you!').respond('reply'))
  bot.listenText(/sup$/, (b) => b.write(':wave:').respond('react'))
}
```

### Adapter Class Example

Hubot
```js
const Adapter = require('hubot').Adapter
class Campfire extends Adapter {
  send (envelope/* , ...strings */) {
    const strings = [].slice.call(arguments, 1)
    const string = strings.shift()
    // 'speak' is a Campfire method, recursive callback sends multiple strings
    this.platform.room(envelope.room).speak(string, (error, data) => {
      this.send.apply(this, [envelope].concat(strings))
    })
  }
}
exports.use = robot => new Campfirerobot
```

bBot
```js
import { MessageAdapter } from 'bBot'
class Campfire extends MessageAdapter {
  async respond (b) {
    switch (b.method) {
      case 'topic': // handle non-standard response methods first
        break;
      default: // `speak` or `send` would be handled as default method
        for (let string of b.envelope.strings) {
          await this.platform.room(b.envelope.room).speak(string)
        }
        break;
    }
  }
}
export const use = bot => new Campfirebot
```
