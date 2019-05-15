/**
 * `hear` middleware can interrupt the thought process, preventing the bot from
 * taking any action on messages matching certain criteria.
 * Call `done()` to exit further processing or `next()` to continue.
 *
 * Test with "hello all" and "hello users"
 */
bot.middleware.hear((b, next, done) => {
  if (b.message.toString().match(/users/i)) done()
  else next()
})

/**
 * `listen` middleware fires on every matching branch, to interrupt, modify or
 * analyse state. This example limits the frequency of the bot's reactions.
 *
 * Test with "hello" multiple times.
 */
bot.middleware.listen((b, next, done) => {
  if (b.branch.id !== 'hello-react') return next()
  const now = new Date()
  const limit = 3 * 1000
  const lastTime = new Date(b.bot.memory.get('reacted') || 0)
  const limitTime = new Date(lastTime.getTime() + limit)
  if (now > limitTime) {
    b.bot.memory.set('reacted', now)
    next()
  } else {
    bot.logger.warn(`ignoring hello until ${limitTime} (now :${now})`)
    done()
  }
})

/**
 * `middleware` respond executes when the bot dispatches messages. It can be
 * used to interrupt or modify state. Respond state includes an array of
 * envelopes (one from each respond, if multiple branches respond to a state),
 * each with an array of strings or rich message payload.
 *
 * This example censors the bot from giving away the same car twice.
 *
 * Test with "door number 3" twice in a row
 */
bot.middleware.respond((b, next, done) => {
  const car = b.bot.memory.get('spare-car') || '🚗'
  b.envelopes.map((envelope, index) => {
    if (envelope.strings) {
      b.envelopes[index].strings = envelope.strings.map((text) => {
        if (text.indexOf('🚗') >= 0) {
          if (car !== '🚗') {
            text = text.replace('🚗', car)
            b.bot.memory.set('spare-car', '🚗')
          } else {
            bot.logger.warn(`Gave away the ${car}, better get out the 🚙`)
            b.bot.memory.set('spare-car', '🚙')
          }
        }
        return text
      })
    }
  })
})
