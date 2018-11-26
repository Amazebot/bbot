import * as bBot from '..'
import Transport from 'winston-transport'
import * as inquirer from 'inquirer'
import chalk from 'chalk'

/** Load prompts and render chat in shell, for testing interactions */
export class Shell extends bBot.MessageAdapter {
  name = 'shell-message-adapter'
  debug: boolean = false
  ui: any
  logs: string[] = ['']
  messages: [string, string][] = []
  line = new inquirer.Separator()
  transport?: Transport
  user?: bBot.User
  room?: { id?: string, name?: string }

  /** Singleton pattern instance */
  private static instance: Shell

  /** Prevent direct access to constructor for singleton adapter */
  private constructor (bot: typeof bBot) {
    super(bot)
  }

  /** Singleton instance init */
  static getInstance (bot: typeof bBot) {
    if (!Shell.instance) Shell.instance = new Shell(bot)
    return Shell.instance
  }

  /** Update chat window and return to input prompt */
  async render () {
    let _ = '\n'
    let n = '           '
    _ += chalk.cyan('╔═════════════════════════════════════════════════════════▶') + '\n'
    for (let m of this.messages.slice(-this.bot.settings.get('shell-size'))) {
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

  /** Register user and room, then render chat with welcome message */
  async start () {
    this.bot.settings.extend({
      'shell-user-name': {
        type: 'string',
        description: 'Pre-filled username for user in shell chat session.'
      },
      'shell-user-id': {
        type: 'string',
        description: 'ID to persist shell user data (or set as "random").',
        default: 'shell-user-01'
      },
      'shell-room-name': {
        type: 'string',
        description: 'Name for "room" of shell chat session.'
      },
      'shell-size': {
        type: 'number',
        description: 'Number of message lines to display in shell chat.',
        default: 5
      }
    })
    this.ui = new inquirer.ui.BottomBar()
    this.bot.path.join((b) => b.respond(
      `${this.user!.name} Welcome to #${this.room!.name}, I'm ${b.bot.settings.get('name')}`,
      `Type "exit" to exit any time.`
    ), { id: 'shell-join' })
    this.bot.path.text(/^exit$/i, (b) => b.bot.shutdown(1), { id: 'shell-exit' })
    this.bot.events.on('started', async () => {
      if (!this.debug) {
        this.logSetup()
        await this.roomSetup()
        await this.bot.receive(new this.bot.EnterMessage(this.user!))
        await this.render()
      }
    })
  }

  /** Write prompt to collect room and user name, or take from env settings */
  async roomSetup () {
    if (
      !this.bot.settings.get('shell-user-name') ||
      !this.bot.settings.get('shell-room-name')
    ) {
      const registration: any = await inquirer.prompt([{
        type: 'input',
        name: 'username',
        message: 'Welcome! What shall I call you?',
        default: 'user'
      },{
        type: 'input',
        name: 'userId',
        message: 'Use ID for user - enter "random" to generate',
        default: 'random'
      },{
        type: 'input',
        name: 'room',
        message: 'And what about this "room"?',
        default: 'shell'
      }])
      if (registration.userId !== 'random') {
        this.bot.settings.set('shell-user-id', registration.userId)
      }
      this.bot.settings.set('shell-user-name', registration.username)
      this.bot.settings.set('shell-room-name', registration.room)
    }
    this.user = new this.bot.User({
      name: this.bot.settings.get('shell-user-name'),
      id: this.bot.settings.get('shell-user-id')
    })
    this.room = { name: this.bot.settings.get('shell-room-name') }
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
      if (text) this.messages.push([this.bot.settings.name, text])
    }
    for (let attachment of (envelope.payload.attachments || [])) {
      if (attachment && attachment.fallback) {
        this.messages.push([this.bot.settings.name, attachment.fallback])
      }
    }
    // @todo Use inquirer prompt as UI to select from quick replies
    if (envelope.payload.quickReplies) {
      this.messages.push([
        this.bot.settings.name,
        `[${envelope.payload.quickReplies.map((qr) => qr.text).join('], [')}]`
      ])
    }
  }

  /** Close inquirer UI and exit process when shutdown complete */
  async shutdown () {
    if (this.ui) this.ui.close()
  }
}

export const use = (bot: typeof bBot) => Shell.getInstance(bot)
