import * as bot from 'bbot'

class App {
  constructor () {
    this.bot = bot
    
    // ...overwrite bot configuration
    // ...extend bBot prototypes with custom features
  }

  async start() {
    await this.bot.load()

    // ...connect events to custom callbacks
    // ...modify logger with custom transports
    // ...add conversation logic
    
    this.bot.start()
  }
}

new App().start()
