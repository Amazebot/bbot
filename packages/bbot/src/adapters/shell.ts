import Transport from 'winston-transport'
import * as inquirer from 'inquirer'
import chalk from 'chalk'
import { Bot, users, User, rooms, Room, Envelope, abstracts } from '..'

/** Load prompts and render chat in shell, for testing interactions */
export class ShellAdapter extends abstracts.MessageAdapter {
  name = 'shell-message-adapter'
  debug: boolean = false
  ui: any
  logs: string[] = ['']
  messages: [string, string][] = []
  user: User = users.blank()
  room: Room = rooms.blank()
  line = new inquirer.Separator()
  transport?: Transport

  /** Update chat window and return to input prompt */
  async render () {
    let _ = '\n'
    let n = '           '
    _ += chalk.cyan('╔═════════════════════════════════════════════════════════▶') + '\n'
    for (let m of this.messages.slice(-this.bot.config.get('shell-size'))) {
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
    this.bot.config.extend({
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
    this.bot.config.load()
    this.ui = new inquirer.ui.BottomBar()
    this.bot.branches.enter((b) => b.respond(
      `@${this.user.name} welcome to #${this.room.name}, I'm ${b.bot.config.get('name')}`,
      `Type "exit" to exit any time.`
    ), { id: 'shell-enter' })
    this.bot.branches.text(/^exit$/i, (b) => b.bot.shutdown(1), { id: 'shell-exit' })
    this.bot.events.on('started', async () => {
      if (!this.debug) {
        this.logSetup()
        await this.roomSetup()
        await this.bot.thoughts.receive(this.bot.messages.enter(this.user))
        await this.render()
      }
    })
  }

  /** Write prompt to collect room and user name, or take from env settings */
  async roomSetup () {
    if (
      !this.bot.config.get('shell-user-name') ||
      !this.bot.config.get('shell-room-name')
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
        this.bot.config.set('shell-user-id', registration.userId)
      }
      this.bot.config.set('shell-user-name', registration.username)
      this.bot.config.set('shell-room-name', registration.room)
    }
    this.room = this.bot.rooms.create({
      name: this.bot.config.get('shell-room-name')
    })
    this.user = this.bot.users.create({
      name: this.bot.config.get('shell-user-name'),
      id: this.bot.config.get('shell-user-id'),
      room: this.room
    })
  }

  /** Prompt for message input, recursive after each render */
  async prompt () {
    const input: any = await inquirer.prompt({
      type: 'input',
      name: 'message',
      message: chalk.magenta(`#${this.room.name}`) + chalk.cyan(' ➤')
    })
    this.messages.push([this.user.name!, input.message])
    await this.bot.thoughts.receive(this.bot.messages.text(this.user, input.message))
    return this.render()
  }

  /** Add outgoing messages and re-render chat */
  async dispatch (envelope: Envelope) {
    for (let text of (envelope.strings || [])) {
      if (text) this.messages.push([this.bot.config.get('name'), text])
    }
    for (let attachment of (envelope.payload.attachments || [])) {
      if (attachment && attachment.fallback) {
        this.messages.push([this.bot.config.get('name'), attachment.fallback])
      }
    }
    // @todo Use inquirer prompt as UI to select from quick replies
    if (envelope.payload.quickReplies) {
      this.messages.push([
        this.bot.config.get('name'),
        `[${envelope.payload.quickReplies.map((qr) => qr.text).join('], [')}]`
      ])
    }
  }

  /** Close inquirer UI and exit process when shutdown complete */
  async shutdown () {
    if (this.ui) this.ui.close()
  }
}

/** Adapter singleton (ish) require pattern. */
let shell: ShellAdapter
export const use = (bBot: Bot) => {
  if (!shell) shell = new ShellAdapter(bBot)
  return shell
}
