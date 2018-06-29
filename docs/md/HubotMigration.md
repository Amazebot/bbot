[thought]: ./ThoughtProcess.md
[bbot]: https://bBot.chat

> Incomplete doc, will be moved to a GH pages repo for [bBot.chat][bbot]

### TODO:
- Add note this a guide for script developers. To see a feature comparison, go here ... <LINK TO ENGINEERING SECTION>
- Requiring/importing the bot...
- Explain async changes, less reliant on callbacks
- Logging and error handling
- Coffee -> ES2015 -> Typescript
- Cut down envelope descriptions by pointing to dedicated doc
- Link paragraphs to examples below and docs for mentioned methods

## Hearing and Listening

`listen`, `hear` and `respond` methods have counterparts within bBot but they
work slightly differently and we've attempted to find more semantic naming.

### Hear ➡️ ListenText
- In **Hubot** `hear` adds a text pattern listener
- In **bBot** `listenText` does the same, where `hear` is the [process][thought]
  which determines if incoming messages will be given to listeners

### Respond ➡️ ListenDirect
- In **Hubot** `respond` adds a text pattern listener that will only match if
  prefixed with the bot's name
- In **bBot** `listenDirect` does the same, where `respond` is used to actually
  initiate the outgoing response and the [process][thought] to handle it

### Listen ➡️ ListenCustom
- In **Hubot** `listen` is a sort of abstract for both `hear` and `respond`
- In **bBot** `listen` is the [process][thought] which provides messages to each
  listener
- `listenCustom` can be used to create a listener with a custom matching
function.

### Example

#### Hubot
```js
module.exports = robot => robot.hear(/.*/, () => console.log('I hear!'))
```

#### bBot
```js
module.exports = bot => bot.listenText(/.*/, () => console.log('I listen!'))
```

## The Response Object vs B State

The semantics of Hubot's `Response` were sometimes misleading, as the "response"
did not always comprise an actual response and may never be used to make one. It
was more like a "context", though there was also a `context` in use by
middleware (which response was a property of) but the full context was not
available to higher level functions, like listeners.

In bBot, we've merged `context` and `response` into an all seeing state class
called `B`. The same state flows through middleware, listeners and responses,
allowing callbacks to be informed by the full processing history.

A state instance, `b` takes the place of `res` as the primary argument passed to
listener callbacks and also provides methods to respond to a received message.

### Example

#### Hubot
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

#### bBot
```js
module.exports = bot => {
  bot.hearMiddleware((b, next, done) => {
    console.log(`Received: ${b.message.toString()}`)
    next()
  })
  bot.listenText(/.*/, (b) => {
    console.log(`Matched on: ${JSON.stringify(b.match)}`)
  }
}
```

## Responding to Messages

In Hubot, the `robot` and `response` both attempted to define a set of common
methods for handling outgoings, like `reply` and `send`, however the semantics
were a bit off. Sometimes `reply` was used unprompted by an incoming message,
so it wasn't really replying, sometimes `send` would be used to "reply".
Sometimes a platform adapter did not support all the defined methods or needed
extending with custom methods of it's own, used inconsistently with Hubot's.

bBot takes a different approach, using an envelope's `method` attribute to
define how the adapter should handle it, e.g as a send (default), an emoji
reaction, a topic change, whatever. This provides message adapters more
flexibility to handle as many or few methods as needed.

There are only two ways to initiate outgoings:
- `respond` is called on a state with an incoming message to respond to.
- `dispatch` can be called from the bot when there's no originating state.

Message adapters only implement `dispatch` to encompass all outgoing content as
an envelope addressed back to the source or to start a new interaction.

### Messages and Envelopes

bBot and Hubot have the same concept of messages and envelopes. Messages are an
incoming object from a messaging platform, parsed by the adapter. Envelopes
address outgoing content, can be unprompted or created to respond to a received
message. The message adapter parses those back into the messaging platform.

In Hubot, envelopes were often plain objects, but bBot adds some helpers to
set attributes and the `room` attribute of an envelope in bBot explicitly
contains `name` or `id` attributes, so adapters can perform better as they don't
need multiple lookups to determine which was given.

### Forming a Response

Hubot's outgoing methods accepted arguments for composing **and** dispatching
the envelope, sometimes in different positions. Some methods accepted strings,
some took the whole envelope object. This often led to tricky argument slicing
and conditionals.

bBot arguments are strictly typed and it aims to give methods clear purpose,
consistent patterns and separation of concerns. Composing and dispatching can
be distinct actions to simplify advanced callbacks, so the *how* is not confused
with the *what*.

Envelope helpers are as follows (and can be chained together):
- `toRoomId` sets the room ID
- `toRoomName` sets the room name
- `write` adds string content
- `attach` adds payload content
- `compose` add strings and/or payloads
- `via` sets the method for the adapter to implement

States can create and dispatch an envelope responding to an incoming message,
inheriting the properties to address it back to the source. Using:
- `respond` to compose and dispatch in one
- `respondVia` to override the default dispatch method, compose and dispatch
- `respondEnvelope` to get the envelope first, if it needs to be re-addressed to 
  a different room or user

### Unprompted Outgoing Example

#### Hubot
```js
module.exports = robot => {
  const room = { name: 'general' }
  const user = { name: 'bilbo' }
  robot.messageRoom(room.name, 'hello #' + room.name)
  robot.reply({ room, user }, 'hello you')
}
```

#### bBot
```js
module.exports = bot => {
  const room = { name: 'general' }
  const user = { name: 'bilbo' }
  bot.dispatch(new bot.Envelope({ room }).compose('hello #' + room.name))
  bot.dispatch(new bot.Envelope({ user }).compose('hello you').via('reply'))
}
```

### Responding to Incoming Example

#### Hubot
```js
module.exports = robot => {
  robot.hear(/say hello to (.*)/i, (res) => res.send('Hello ' + res.match[1])
  robot.hear(/can anyone hear me/i, (res) => {
    robot.adapter.react(res.envelope, ':raising-hand:')
  })
  robot.hear(/welcome me to the (.*) room/i, (res) => {
    res.envelope.room = res.match[1]
    res.reply('Welcome')
  })
}
```

#### bBot
```js
module.exports = bot => {
  bot.listenText(/say hello to (.*)/i, (b) => b.respond('Hello ' + res.match[1])
  bot.listenText(/can anyone hear me/i, (b) => b.respondVia('react', ':raising-hand:')
  bot.listenText(/welcome me to the (.*) room/i, (b) => {
    b.respondEnvelope().toRoomName(b.match[1])
    b.respondVia('reply', 'Welcome')
  })
}
```

### Adapter Class Example

#### Hubot
```js
const { Adapter } = require('hubot')
class Campfire extends Adapter {
  send (envelope/* , ...strings */) {
    const strings = [].slice.call(arguments, 1)
    const string = strings.shift()
    // 'speak' is a Campfire method, recursive callback sends multiple strings
    this.platform.room(envelope.room).speak(string, (error, data) => {
      this.send.apply(this, [envelope].concat(strings))
    })
  }
  topic (envelope, topic) {
    // < handle custom outgoing method >
  }
}
exports.use = robot => new Campfire(robot)
```

#### bBot
```js
const { MessageAdapter } = require('bBot')
class Campfire extends MessageAdapter {
  async dispatch (envelope) {
    switch (envelope.method) {
      case 'topic': 
        // < handle custom outgoing method >
        break;
      default: // `speak` or `send` would be handled as default method
        for (let string of b.envelope.strings) {
          await this.platform.room(b.envelope.room).speak(string)
        }
        break;
    }
  }
}
exports.use = bot => new Campfire(bot)
```

Alternatively, adapters could define platform methods, to relay from dispatch:

```js
const { MessageAdapter } = require('bBot')
class Campfire extends MessageAdapter {
  dispatch (envelope) {
    return this[envelope.method](envelope)
  }
  send (envelope) {
    return this.speak(envelope) // proxy to re-direct default method
  }
  async speak (envelope) {
    for (let string of b.envelope.strings) {
      await this.platform.room(b.envelope.room).speak(string)
    }
  }
  async topic (envelope) {
    // < handle custom outgoing method >
  }
}
```
