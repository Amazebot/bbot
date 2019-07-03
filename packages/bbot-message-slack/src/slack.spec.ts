import 'mocha'
import 'dotenv/config'
import { expect } from 'chai'
// import * as faker from 'faker'
import { SlackClient } from './slack'

let slack: SlackClient

describe('[SlackClient]', () => {
  describe('.connect', () => {
    it('connects Slack RTM client', async () => {
      slack = new SlackClient(process.env.SLACK_USER_TOKEN!)
      await slack.connect()
      expect(slack.rtm.authenticated).to.equal(true)
    })
    it('connects Slack Web client', async () => {
      slack = new SlackClient(process.env.SLACK_USER_TOKEN!)
      await slack.connect()
      const { ok } = await slack.web.api.test()
      expect(ok).to.equal(true)
    })
    it('returns connected workspace meta', async () => {
      slack = new SlackClient(process.env.SLACK_USER_TOKEN!)
      const connection = await slack.connect()
      expect(connection).to.include.all.keys(['team', 'self'])
    })
  })
})
