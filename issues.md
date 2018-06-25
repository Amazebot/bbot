# Start exported bot from script entry point

The default export for the main npm module does not start the bot, so it can be
required and started manually after manual configuration / manipulation.
However, in most cases it will be configured from command line args and started
immediately, loading scripts automatically. In that case, e.g. for a Glitch or
Heroku instance as a node package requiring bBot, the entry point might be a
script that calls `require('bbot/dist/start')` or executes it directly from
node, with `node -r dotenv/config node_modules/bbot/dist/start`.

Need to test this in different production environments to see if it's effective.

NB: Glitch actually loads environment by default, so the start script would just
need `node node_modules/bbot/dist/start` with a scripts dir.

See https://github.com/Amazebot/bbot/blob/master/src/start.spec.ts#L5

- release

---

# Move Rocket.Chat adapter to it's own repo to lighten dependencies.
See https://github.com/Amazebot/bbot/blob/master/src/adapters/rocketchat.ts

- release

---

# Reactions demo

Complete Rocket.Chat adapter demo with a demonstration of reactions using text,
custom and NLU listeners.
- Use https://github.com/omnidan/node-emoji to match any emoji key
- Add middleware parsing actual emoji in strings into their key
- Use sentiment middleware (or draft NLU adapter) to get sentiment if unmatched and react with :| :) or :(

See https://github.com/Amazebot/bbot/blob/master/src/demo/rocketchat.ts

- alpha

---

# Ensure each processed listener given isolated state

Test that states within subsequent listeners is isolated.
I think it's inheriting changes from the last processed listener.

See https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.spec.ts

- alpha

---

# Disable file logging when running demos

Use Winston methods to disable file transports in bot.logger

See https://github.com/Amazebot/bbot/blob/master/src/demo/listen-types.ts

- release
- help

---

# Use exported interfaces in Rocket.Chat adapter

Rocket.Chat SDK exports Typescript definitions (or should), so they can be used
to provide better type checking and intellisense when developing the Rocket.Chat
adapter. e.g. for message and meta attributes in response/listener callbacks.

This should probably be moved as an issue on the adapter when that's moved to
an external repo.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/rocketchat.ts

- release
- related Move Rocket.Chat adapter...

---

# Confirm Rocket.Chat message user alias is on message schema

Seems like it would be on the user object, but the schema docs list it on the
message object.

- no milestone
- help
- related Move Rocket.Chat adapter...

see https://github.com/Amazebot/bbot/blob/master/src/adapters/rocketchat.ts

---

# Refactor Redis adapter from Hubot

Redis adapter will be a default option, along with Mongo DB.

The Hubot adapter will be similar but doesn't include long term serial storage.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/redis.ts

- release

---

# Brain saveMemory only save difference since last save

Storage adapter should compare to copy from last save and only update difference

- enhancement
- no milestone

---

# Storage adapters could restore classes

When storing instances of a class, everything is converted to plain objects, but
if the storage adapter stored a reference to the constructor when keeping, it
could restore the instance when finding by calling the constructor or using the
prototype and `object.create`) with the object attributes.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/mongo.ts

- enhancement
- no milestone

---

# Mongo storage adapter could query sub-documents

By refactoring the storage model with `data` as sub-documents (instead of basic
array), the adapter could perform mongo queries on sub-documents instead of
getting the whole array back and filtering in-memory with javascript.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/mongo.ts#L120

- enhancement
- no milestone

---

# Recommend usage of `findOne` over `find` in Storage adapter docs

Add note in docs recommending not to use find on large data sets.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/mongo.ts#L120

- related above
- enhancement
- no milestone

---

# Middleware should call new done function from prior piece

Test newDone is called if done called with a function - suspect not

see https://github.com/Amazebot/bbot/blob/master/src/adapters/mongo.ts#L120

- bug
- release

---

# Middleware `IPieceDone` shouldn't require async

The `executePiece` could wrap calling `done()` in a `Promise.resolve`, allowing
`IPieceDone` interface to accept functions resolving with `Promise<void>|void`.

Then update tests that use `() => Promise.resolve()` to just `() => null`.

see https://github.com/Amazebot/bbot/blob/master/src/adapters/mongo.ts#L120

- enhancement
- release

---

# Update thought process generated docs

Method headers should be consistent and contain inline comments.

see https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.ts

- docs
- alpha

---

# Should a matching listener prevent further matching by default

Need feedback to asses if listeners should require `done` to be set to prevent
further processing, or if that should be the default. Currently, many listeners
could fire on the same input, which is intentional because not all listeners
respond to an input, some might perform a callback which is required even if
other listeners fire. It might be preferable though, to make the opposite the
default and require some attribute on the listener to say it should match even
if others have.

see https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.ts

- enhancement
- question
- no milestone

# Thought process updates for NLU adapter

Requires first NLU adapter built, then
- [ ] call NLU adapter to understand, add result to `b.message.nlu`
- [ ] test with bundled NLP adapter

see https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.ts#L32

- release
- bug

---

# Thought process updates for alpha

Remember process `remember` checks for prior remembering, as it is used by the
final callback on both listen and respond, as respond might be called without a
listen.
 
There could be a more graceful way of handling the thought process completion,
like possible using a single interface for all processes. e.g.
`thought('hear', args)`

Then it can add the final piece only once, when used either as thought('hear')
or thought('respond'). Could still retain bot.hear and bot.respond as proxies.

Should that also revert usage of `bot.listen` in place of `bot.listenText`.
Maybe all thought stages should only be called internally and bot accessors are
`bot.receive` and `bot.send` - for hubot compatibility and since when
`bot.respond` is called directly, its actually unprompted, therefore not a
response.

Consider renaming `thought-process.ts` as just `thought.ts` too.
Move adapter storage check into brain, remember should just call keep.

Consider use of thought for custom contained sets of listeners (e.g. within a
scene), might make sense to accept the listeners as arg, but use the 'global'
listeners as default. Scenes shouldn't reproduce thought process the way it is
in current Playbook.

- alpha
- docs
- enhancement

see https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.ts#L94

---

# Add thought process tests

Check that respond
  - [ ] executes middleware
  - [ ] adds default envelope
  - [ ] adds responded ts, calls callback
  - [ ] use .hear as example for above
  - [ ] check message adapter tests updated for .respond to have
  - [ ] check that listen and understand go to remember with or without respond
  - [ ] remember should record matched and unmatched, for statistics

see https://github.com/Amazebot/bbot/blob/master/src/lib/thought-process.spec.ts#305

- alpha

---

# Add test for `catchAllListeners` in thought process spec */

see https://github.com/Amazebot/bbot/blob/master/src/lib/listen.ts#14

- enhancement
- release

---

# Update Natural Language Listeners

Matcher is uninformed at this stage, without actual results from adapter.
`INaturalLanguageListenerOptions` should be reviewed in action with some real
NLU results and listeners in a production use-case.

Should also use argv / environment variable for default confidence threshold.

- enhancement
- related NLU adapter
- release

see https://github.com/Amazebot/bbot/blob/master/src/lib/listen.ts#200

---

# Fix `understandDirect` matcher

Listener should match when the input text is prefixed with the bot's name and
the rest of the message matches as per regular NLU listeners.

- bug
- release

see https://github.com/Amazebot/bbot/blob/master/src/lib/listen.ts#317

---

# Fix inconsistent module references

The brain module calls its own methods as they are exported via `bot.`, instead
of just calling the method name directly from within the module. This allows
tests to stub and spy (which they otherwise can't on exported methods).

This is inconsistent with coding style of other modules. Need to either change
all modules to call own methods via `bot.`, then remove some of the workarounds
used in spec, or find another way to make assertions in the brain spec and
remove the `bot.` from its own method calls. The latter is probably preferred.

- enhancement
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/brain.ts

---

# Add more excluded keys from storage

Only the bot instance is removed from states and other objects before keeping
via storage adapter. This improves performance and prevents crashing when store
encounters cyclical references in data. Could probably find some more attributes
that aren't required in storage, to reduce memory requirements.

- enhancement
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/brain.ts#L11

---

# Improve brain method modularity

Refactor object filtering in `.keep` as a single exported utility, something
like `.convertForStorage`.

Add test for new method that state translates to plain object.

see https://github.com/Amazebot/bbot/blob/master/src/lib/brain.ts#L88

- enhancement
- release

----

# Improve users returned from brain

`brain.users` should return iterable instance with methods for looping or
finding users.

- enhancement
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/brain.ts#L140

---

# Improve usage of Winston logger

- [ ] Update to Winston v3 when typings complete.
- [ ] Add filter to prevent logging passwords etc

- enhancement
- help

see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20418

see https://github.com/Amazebot/bbot/blob/master/src/lib/logger.ts#L23

---

# Restore config file testing without crashing Wallaby.js

Something about the use of a mock file load in the test breaks Wallaby.

- bug
- help
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/config.spec.ts#L28

---

# Fix testing log error handling

Winston logger should automatically handle uncaught exceptions and log an error
message, but it's tricky to test uncaught exceptions in mocha because it will
throw the test. No solution in mind.

- bug
- help
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/logger.spec.ts#L34

---

# Improve return values for storage adapter methods

Define return types for `lose` and `keep` to indicate success or count, instead
of returning undefined.

- enhancement
- no milestone

see https://github.com/Amazebot/bbot/blob/master/src/lib/adapter-classes-storage.ts#L7

---