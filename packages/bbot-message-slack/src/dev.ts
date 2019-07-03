/** @module Dev creates client to debug/listen for events without bot. */

// import { SlackClient } from './slack'
import * as bbot from 'bbot'

async function start () {
  console.log(Object.keys(bbot))
  // const client = new SlackClient(process.env.SLACK_USER_TOKEN!)
}

start()
