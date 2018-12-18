import mongoose from 'mongoose'
import adapters from '../controllers/adapters'
import { Bot } from '../bot'

export interface IStore extends mongoose.Document {
  type: string,
  sub: string,
  data: any
}

const models: { [key: string]: mongoose.Model<mongoose.Document> } = {}
export function getModel (collection: string) {
  if (!models[collection]) {
    delete mongoose.connection.models[collection] // make sure its gone
    models[collection] = mongoose.model(collection, new mongoose.Schema({
      type: { type: String },
      sub: { type: String, lowercase: true },
      data: { type: mongoose.Schema.Types.Mixed }
    }, { collection }))
  }
  return models[collection]
}

/**
 * Mongo Storage Adapter, keeps bBot brain data collections as sub-collection
 * of a single parent Mongo DB model/collection. The `memory` sub-collection
 * keeps the brain's in-memory data assigned against it's key (e.g. `users`).
 * Long-term data is stored in sub-collections alongside memory, using either
 * a key for key/value pairs, or a key-less array for serial data.
 */
export class Mongo extends adapters.abstract.Storage {
  name = 'mongo-storage-adapter'
  config = {
    useNewUrlParser: true,
    autoIndex: true, // Build indexes
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    keepAlive: 120
  }
  model: mongoose.Model<mongoose.Document>
  store?: mongoose.Mongoose

  /** Create mongo instance, initialise settings and model. */
  constructor (bot: Bot) {
    super(bot)
    this.bot.config.extend({
      'db-url': {
        type: 'string',
        alias: 'mongodb-url',
        description: 'Storage adapter address for mongo database',
        default: `mongodb://127.0.0.1:27017/${bot.config.get('name')}-brain`
      },
      'db-collection': {
        type: 'string',
        alias: 'brain-collection',
        description: 'Collection in DB for the bot brain and state data',
        default: `brain`
      }
    })
    this.bot.config.get('db-collection') // ?
    this.model = getModel(this.bot.config.get('db-collection'))
    this.bot.logger.info(`[mongo] using Mongo as storage adapter.`)
    this.bot.logger.debug(`[mongo] storing to '${this.bot.config.get('db-collection')}' collection at ${this.bot.config.get('db-url')}`)
  }

  /** Connect to Mongo. */
  async start () {
    this.bot.logger.info(`[mongo] connecting to Mongo DB at ${this.bot.config.get('db-url')}`)
    this.store = await mongoose.connect(this.bot.config.get('db-url'), this.config)
    this.bot.logger.debug(`[mongo] connected to Mongo DB`)
    return
  }

  /** Disconnect Mongo */
  async shutdown () {
    await mongoose.disconnect()
    return
  }

  /** Put memory data in documents by sub-collection. */
  async saveMemory (data: any) {
    for (let sub in data) {
      const query = { sub, type: 'memory' }
      const doc = { data: data[sub] }
      const options = { upsert: true, lean: true }
      await this.model.findOneAndUpdate(query, doc, options).exec()
    }
    return
  }

  /** Get all the memory document data. */
  async loadMemory () {
    this.bot.logger.debug(`[mongo] loading memory data from DB`)
    const query = { type: 'memory' }
    const fields = { _id: 0, 'data': 1, 'sub': 1 }
    const opts = { lean: true }
    const docs = await this.model.find(query, fields, opts).exec() as IStore[]
    if (!docs) return undefined
    const memory: any = {}
    for (let doc of docs) {
      if (doc.sub === 'users') {
        if (!memory[doc.sub]) memory[doc.sub] = {}
        for (let id in doc.data) {
          memory[doc.sub][id] = this.bot.users.fromId(doc.data[id])
        }
      } else {
        memory[doc.sub] = doc.data
      }
    }
    return memory
  }

  /** Add item to serial store data. */
  async keep (sub: string, data: any) {
    try {
      this.bot.logger.debug(`[mongo] keep ${sub} value in DB`)
      const query = { sub, type: 'store' }
      const update = { $push: { data } }
      const options: mongoose.ModelFindOneAndUpdateOptions = { upsert: true }
      await this.model.findOneAndUpdate(query, update, options).lean().exec()
      this.bot.logger.debug(`[mongo] kept ${sub}: ${JSON.stringify(update)}`)
    } catch (err) {
      this.bot.logger.error(`[mongo] keep error for ${sub}`, err)
    }
  }

  /** Find certain stuff in Mongo. */
  async find (sub: string, params: any) {
    this.bot.logger.debug(`[mongo] finding any ${sub} matching ${params}`)
    const query = { sub, data: { $elemMatch: params }, type: 'store' }
    const fields = { _id: 0, 'data': 1 }
    const doc = await this.model.findOne(query, fields).lean().exec() as IStore
    if (!doc) return undefined
    const matching = doc.data.filter((item: any) => {
      if (!Object.keys(params).length) return true
      let match = false
      for (let key in params) {
        const valueAtKey = key.split('.').reduce((pre, cur) => pre[cur], item)
        match = (valueAtKey === params[key])
      }
      return match
    })
    this.bot.logger.debug(`[mongo] found ${matching.length} matching ${sub}s.`)
    return matching
  }

  /** Find a thing in Mongo. */
  async findOne (sub: string, params: any) {
    this.bot.logger.debug(`[mongo] finding a ${sub} matching ${params}`)
    const query = { sub, data: { $elemMatch: params }, type: 'store' }
    const fields = { _id: 0, 'data.$': 1 }
    const doc = await this.model.findOne(query, fields).lean().exec() as IStore
    if (!doc) return undefined
    this.bot.logger.debug(`[mongo] found a ${sub}: ${JSON.stringify(doc.data[0])}`)
    return doc.data[0]
  }

  /** Get rid of stuff in Mongo. */
  async lose (sub: string, params: any) {
    this.bot.logger.debug(`[mongo] losing a ${sub} matching ${params}`)
    const query = { sub, type: 'store' }
    const update = { $pull: { data: params } }
    const options: mongoose.ModelFindOneAndUpdateOptions = { upsert: true }
    await this.model.findOneAndUpdate(query, update, options).lean().exec()
  }
}

/** Adapter singleton (ish) require pattern. */
let mongo: Mongo
export const use = (bBot: bot.Bot) => {
  if (!mongo) mongo = new Mongo(bBot)
  return mongo
}
