import * as bot from '..'

/** A conversational utility, routes input to isolated paths and branches. */
class Scene {
  engaged: { [userId: string]: bot.Path } = {}

  /**
   * Create scene to route input from engaged users to path and branch sub-sets.
   * Clones the current state to re-receive within isolated thought process.
   * The new receive happens at the end of Node's event loop so the first one
   * can resolve first.
   */
  enter (b) {
    bot.hearMiddleware(async (b, next, done) => {
      const uId = b.message.user.id
      if (this.isEngaged(uId) && b.scope === 'global') {
        b.ignore()
        bot.logger.debug(`[scene] entering ${b.message.user.name} into scene.`)
        await bot.receive(b.message, this.path(uId))
        done()
      } else {
        next()
      }
    })
  }

  /** Check if a user ID has an open scene. */
  isEngaged (userId: string) {
    return (Object.keys(this.engaged).indexOf(userId) > -1)
  }

  /** Add listeners as branches in a scene path for a user. */
  path (userId) {
    if (this.isEngaged(userId)) return this.engaged[userId]
    this.engaged[userId] = new this.bot.Path({ scope: 'scene' })
    return this.engaged[userId]
  }

  /** Remove user from engaged, returning them to global scope */
  exit (userId) {
    if (this.isEngaged(userId)) delete this.engaged[userId]
  }
}

export const scene = new Scene()
