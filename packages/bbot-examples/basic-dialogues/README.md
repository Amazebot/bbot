* @example <caption>Dialogue implicitly created from a global branch</caption>
 *  bot.branches.text(/hello/i, (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.branches.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.branches.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  })
 * @example <caption>Put user into pre-defined dialogue from multiple events</caption>
 *  const dialogue = bot.dialogue.create(options)
 *  dialogue.onOpen = (b) => {
 *    b.respond(`Hello, do you want to see our inventory?`)
 *    b.branches.text(/no/i, (b) => b.respond(`OK, bye.`)) // auto-close dialogue
 *    b.branches.text(/yes/i, (b) => inventoryQuery(b)) // add more branches here
 *  }
 *  bot.branches.text(/hello/i, (b) => dialogue.open(b))
 *  bot.branches.enter((b) => dialogue.open(b))
 * @example <caption>Dispatch envelope, opening dialogue for outgoing state</caption>
 *  const envelope = bot.envelope.create({ user })
 *  envelope.write('Hello, do you want to see our inventory?')
 *  const dialogue = bot.dialogue.create(options)
 *  const state = bot.thought.dispatch(envelope)
 *  dialogue.open(state)
 *  dialogue.branches.text(/no/i, (b) => b.respond(`O
 * K, bye.`))
 *  dialogue.branches.text(/yes/i, (b) => inventoryQuery(b))
 *  dialogue.branches.text(/quit/i, (b) => dialogue.close())
 * @example <caption>Use function to add branches for current state dialogue</caption>
 *  function inventoryQuery((b) => {
 *    b.respond('OK, I can show you *cars*, or *bikes*?')
 *    b.branches.text(/car/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.branches.text(/blue/i, (b) => b.respond('🚙'))
 *      b.branches.text(/red/i, (b) => b.respond('🚗'))
 *    })
 *    b.branches.text(/bike/i, (b) => {
 *      b.respond('*Blue* or *red*')
 *      b.branches.text(/blue/i, (b) => b.respond('🚵‍♂️'))
 *      b.branches.text(/red/i, (b) => b.respond('🚵‍♀️'))
 *    })
 *  })
