import * as bBot from '..'
import Transport from 'winston-transport'
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
  // @todo extend bot settings instead...
  userName = process.env.BOT_SHELL_USER_NAME
  userId = process.env.BOT_SHELL_USER_ID
  roomName = process.env.BOT_SHELL_ROOM
  transport?: Transport
  user?: bBot.User
  room?: { id?: string, name?: string }

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

  /** Re-route console transport to shell's own logger */
  logSetup () {
    this.bot.logger.debug('[shell] Re-routing logs to shell UI from here...')
    class ShellTransport extends Transport {}
    this.transport = new ShellTransport()
    this.transport.log = this.log.bind(this)
    const consoleLogger = this.bot.logger.transports.find((t: any) => t.name === 'console')
    if (consoleLogger) this.bot.logger.remove(consoleLogger)
    this.bot.logger.add(this.transport)
  }

  /** Write log events to the inquirer UI */
  log (logEvent: any, callback: any) {
    if (this.ui) {
      const { message, level } = logEvent
      let item = `${level}: ${message}`
      switch (level) {
        case 'debug': item = chalk.gray(item); break
        case 'warn': item = chalk.magenta(item); break
        case 'error': item = chalk.red(item)
      }
      this.ui.log.write(item.trim())
    }
    callback()
  }

  /** Write prompt to collect room and user name, or take from env settings */
  async roomSetup () {
    if (this.userName && this.roomName) {
      this.user = new this.bot.User({ name: this.userName, id: this.userId })
      this.room = { name: this.roomName }
    } else {
      const registration: any = await inquirer.prompt([{
        type: 'input',
        name: 'username',
        message: 'Welcome! What shall I call you?',
        default: 'user'
      },{
        type: 'input',
        name: 'userId',
        message: 'Use ID for user, or generate random?',
        default: 'random'
      },{
        type: 'input',
        name: 'room',
        message: 'And what about this "room"?',
        default: 'shell'
      }])
      if (registration.userId !== 'random') this.userId = registration.userId
      this.user = new this.bot.User({
        name: registration.username,
        id: this.userId
      })
      this.room = { name: registration.room }
    }
  }

  /** Register user and room, then render chat with welcome message */
  async start () {
    this.ui = new inquirer.ui.BottomBar()
    this.bot.global.enter((b) => b.respond(
      `@${this.user!.name} Welcome to #${this.room!.name}, I'm @${b.bot.settings.name}`,
      `Type "exit" to exit any time.`
    ), { id: 'shell-enter' })
    this.bot.global.text(/^exit$/i, (b) => b.bot.shutdown(1), { id: 'shell-exit' })
    this.bot.events.on('started', async () => {
      this.logSetup()
      await this.roomSetup()
      await this.bot.receive(new this.bot.EnterMessage(this.user!))
      await this.render()
    })
  }

  /** Prompt for message input, recursive after each render */
  async prompt () {
    const input: any = await inquirer.prompt({
      type: 'input',
      name: 'message',
      message: chalk.magenta(`#${this.room!.name}`) + chalk.cyan(' ➤')
    })
    this.messages.push([this.user!.name!, input.message])
    await this.bot.receive(new this.bot.TextMessage(this.user!, input.message))
    return this.render()
  }

  /** Add outgoing messages and re-render chat */
  async dispatch (envelope: bBot.Envelope) {
    for (let text of (envelope.strings || [])) {
      this.messages.push([this.bot.settings.name, text])
    }
  }

  /** Close inquirer UI and exit process when shutdown complete */
  async shutdown () {
    if (this.ui) this.ui.close()
  }
}

export const use = (bot: typeof bBot) => new Shell(bot)
