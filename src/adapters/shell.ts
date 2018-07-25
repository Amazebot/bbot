import * as bBot from '..'
import * as inquirer from 'inquirer'
import chalk from 'chalk'

/** Load prompts and render chat in shell, for testing interactions */
export class Shell extends bBot.MessageAdapter {
  name = 'shell-message-adapter'
  ui: any
  logs: string[] = ['']
  messages: [string, string][] = []
  line = new inquirer.Separator()
  settings = {
    chatSize: 5
  }

  /** Update chat window and return to input prompt */
  async render () {
    let _ = '\n'
    let n = '           '
    _ += chalk.cyan('╔═════════════════════════════════════════════════════════▶') + '\n'
    for (let m of this.messages.slice(-this.settings.chatSize)) {
      _ += chalk.cyan(`║${n.substr(0, n.length - m[0].length) + m[0]} ┆ `) + m[1] + '\n'
    }
    _ += chalk.cyan('╚═════════════════════════════════════════════════════════▶') + '\n\n'
    this.ui.updateBottomBar(_)
    await this.prompt()
  }

  /** Route log events to the inquirer UI (only the combined log) */
  log (transport: any, level: string, msg: string) {
    if (transport.name === 'console') {
      let item = `[${level}]${msg}`
      switch (level) {
        case 'debug': item = chalk.gray(item)
          break
        case 'warn': item = chalk.magenta(item)
          break
        case 'error': item = chalk.red(item)
      }
      this.ui.writeLog(item)
    }
  }

  /** Register user and room, then render chat with welcome message */
  async start () {
    this.bot.events.on('started', async () => {
      const registration: any = await inquirer.prompt([{
        type: 'input',
        name: 'username',
        message: 'Welcome! What shall I call you?',
        default: 'user'
      },{
        type: 'input',
        name: 'room',
        message: 'And what about this "room"?',
        default: 'shell'
      }])
      this.bot.logger.on('logging', this.log.bind(this))
      this.user = new this.bot.User({ name: registration.username })
      this.room = { name: registration.room }
      const e = new this.bot.Envelope()
      this.ui = new inquirer.ui.BottomBar()
      e.write(`Hi @${this.user.name}. Welcome to #${this.room.name}, I'm @${this.bot.name}`)
      e.write(`Type "exit" to exit any time.`)
      await this.dispatch(e)
      await this.render()
    })
  }

  /** Prompt for message input, recursive after each render */
  async prompt () {
    const input: any = await inquirer.prompt({
      type: 'input',
      name: 'message',
      message: chalk.magenta(`#${this.room.name}`) + chalk.cyan(' ➤')
    })
    if ((input.message as string).toLowerCase() === 'exit') {
      return this.bot.shutdown()
    }
    this.messages.push([this.user.name, input.message])
    await this.bot.receive(new this.bot.TextMessage(this.user, input.message))
    return this.render()
  }

  /** Add outgoing messages and re-render chat */
  async dispatch (envelope: bBot.Envelope) {
    for (let text of (envelope.strings || [])) {
      this.messages.push([this.bot.name, text])
    }
  }

  /** Close inquirer UI and exit process when shutdown complete */
  async shutdown () {
    if (this.ui) this.ui.close()
    this.bot.events.on('shutdown', () => process.exit(0))
  }
}

export const use = (bot: typeof bBot) => new Shell(bot)
