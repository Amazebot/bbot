# Thought Process

The bBot *Thought Process* describes how this clever and purposeful bot
elegantly handles discourse.

The internals involve a series processing steps, defined by a middleware stack
and callback for each. Each middleware receives the current state of processing.

For help interacting with middleware, see [Middleware.md](Middleware.md).

It all starts when the message adapter inputs a message via a `.receive` call.

## Hear

bBbot hears all messages to determine if the context requires attention.
It gather information for better listening, or ignores if it shouldn't listen.

Add a middleware piece via `.hearMiddleware` to interrupt the process or modify
the state for further processing.

## Listen

bBot takes in the message and if recognised, runs the scenario, furthering a
conversation or a simple exchange. It may not be immediately understood.

Listeners provide a matching function to evaluate the message and fire callbacks
(or execute a named `bit`) on match. They are added with the following methods:

- `.listenText` adds regular expression matching on message text
- `.listenDirect` adds regular expressions prepended with the bot's name
- `.listenCustom` adds a custom matching method, e.g. match on an attribute

Add a middleware piece via `.listenMiddleware` to fire on every matching
listener, to interrupt or modify the state.

If no listeners fire yet, we include listeners from the next (Understand) stage.

## Understand

bBot can use natural language services to listen for the intent rather than the
exact command. The nature of the message is collected from external providers.

A special type of `NaturalLanguageListener` is used for this stage, that
evaluates the intent, entities and/or sentiment of the message, by sending the
message to the NLU adapter.

- `.understandText` adds natural language matching on intent/entities/sentiment
- `.understandDirect` adds natural language that must be addressed to the bot
- `.understandCustom` adds custom natural language matching (given NLU result)

Add a middleware piece via `.understandMiddleware` to execute on every matching
language listener, to interrupt or modify the state.

## Act

bBot takes action when all else fails, locally or through external integrations.

This is an outcome of `listen` and `understand` stages passing without any
listener matching, bBot creates a special `CatchAllMessage` message to receive
in new set of listeners can take action when nothing else did.

- `.listenCatchAll` adds a callback for any unmatched message

Add a middleware piece via `.actMiddleware` to execute on every matching
catch-all listener, to interrupt or modify the state.

## Respond.

bBot replies to the people it's engaged with appropriately. Canned responses
are mixed with context and may include rich UI elements.

Add a middleware piece via `.respondMiddleware` to execute on any sends, if
matched callbacks or bits prompted messages to be sent.

## Remember.

bBot remembers everything, the person, context and content. Important details
are kept for quick access. Everything else is stored for safekeeping.

That all might take a few milliseconds, then we're back at the beginning.
