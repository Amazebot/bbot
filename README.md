# bbot
An adaptable engine for conversational UI
---

### `#master`

[![npm version](https://img.shields.io/npm/v/bbot.svg?style=flat)](https://www.npmjs.com/package/bbot)
[![CircleCI](https://circleci.com/gh/Amazebot/bbot/tree/master.svg?style=shield)](https://circleci.com/gh/Amazebot/bbot/tree/master)
[![codecov](https://codecov.io/gh/Amazebot/bbot/branch/master/graph/badge.svg)](https://codecov.io/gh/Amazebot/bbot/branch/master)
[![dependencies Status](https://david-dm.org/amazebot/bbot/status.svg)](https://david-dm.org/amazebot/bbot)

### `#develop`

[![npm version](https://img.shields.io/npm/v/bbot.svg?style=flat)](https://www.npmjs.com/package/bbot/v/develop)
[![CircleCI](https://circleci.com/gh/Amazebot/bbot/tree/develop.svg?style=shield)](https://circleci.com/gh/Amazebot/bbot/tree/develop)
[![codecov](https://codecov.io/gh/Amazebot/bbot/branch/develop/graph/badge.svg)](https://codecov.io/gh/Amazebot/bbot/branch/develop)
[![devDependencies Status](https://david-dm.org/amazebot/bbot/dev-status.svg)](https://david-dm.org/amazebot/bbot?type=dev)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![chat at Rocket.Chat](https://img.shields.io/badge/chat%20at-open.rocket.chat-red.svg)](https://open.rocket.chat/channel/bbot)

____

## Using bBot

👩‍💻  
Visit [bbot.chat](http://bbot.chat/) for docs on [installing and running](http://bbot.chat/docs/core) and guides for [building with bBot](http://bbot.chat/#buildingwithbbot).

🤓  
Dig into the generated [API docs](https://amazebot.github.io/bbot/) for full details of every module and method.

💻  
Use our starter code, bundled with a setup script and basic examples. Grab the [bBot Boilerplate](https://github.com/Amazebot/bbot-boilerplate).

## Getting Support

🚀  
Join the [#bbot community support channel](https://open.rocket.chat/channel/bbot) on the [Rocket.Chat open server](https://open.rocket.chat).

🙋‍  
While in pre-release, priority support can only be provided to our sponsors and enterprise partners.

## Giving Support

🌟  
We need 100 stars to setup an [Open Collective](https://opencollective.com/). Please [star the project on GitHub](https://github.com/Amazebot/bbot) and join our [stargazers](https://github.com/Amazebot/bbot/stargazers).

✉️  
We are an open source project sponsored by enterprise partners. [Contact us](mailto:hello@amazebot.chat) if you'd like become a sponsor.

## Contributing

❤️  
We live for open source and love contributions. Join our [contributor community on Rocket.Chat](https://open.rocket.chat/channel/bbot).

🏛️  
Before you get started, please read our [Code of Conduct](https://github.com/Amazebot/bbot/blob/master/CODE_OF_CONDUCT.md).

🤯  
If you're unfamiliar with the process, please read the amazing [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/).

👨‍💻  
Test and compile with `yarn build` before commits. Use `yarn commit` for the [commitizen](http://commitizen.github.io/cz-cli/) commit message wizard.

❓  
Looking for somewhere to get started? Review our [basic](https://github.com/Amazebot/bbot/labels/BASIC) and [help](https://github.com/Amazebot/bbot/labels/HELP) wanted issues.

## Development

Use package scripts for dev workflow:
- `yarn test` to check changes for error
- `yarn test:watch` to auto-test changes
- `yarn build` to test and compile
- `yarn build:watch` to auto-compile changes
- `yarn link` to use as local dependency
- `yarn stage` to stage all changes
- `yarn commit` to run commit wizard
- `yarn local` to run bot from source
- `yarn start` to run bot from dist

### Clone Project

System requirements (osx):

| Requirement     | Command                                             |
| --------------- | --------------------------------------------------- |
| Homebrew        | `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"` |
| Node.js         | `brew install node` |
| Yarn            | `npm install -g yarn` |

Install and run bBot:

| Step            | Command                                             |
| --------------- | --------------------------------------------------- |
| Clone bBot      | `git clone https://github.com/Amazebot/bbot.git bbot` |
| Enter path      | `cd bbot` |
| Install deps    | `yarn install` |
| Run shell chat  | `yarn local` |

### Chat in Rocket.Chat

System requirements (osx):

| Requirement     | Command                                             |
| --------------- | --------------------------------------------------- |
| Homebrew        | `/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"` |
| Meteor          | `curl https://install.meteor.com/ | sh` |
| MongoDB         | `brew install mongodb` |
| Mongo service   | `ln -sfv /usr/local/opt/mongodb/*.plist ~/Library/LaunchAgents` |

Run Rocket.Chat instance (outside bBot path):

| Step            | Command                                             |
| --------------- | --------------------------------------------------- |
| Clone Rocket.Chat | `git clone https://github.com/RocketChat/Rocket.Chat.git rocketchat-bbot` |
| Enter path        | `cd rocketchat-bbot` |
| Install deps      | `meteor npm install` |
| Run Rocket.Chat   | `export MONGO_URL='mongodb://localhost:27017/rc-bbot'; meteor` |
| Create bot user   | https://rocket.chat/docs/bots/creating-bot-users/ |

Run bBot with Rocket.Chat (from bBot path):

| Step            | Command                                             |
| --------------- | --------------------------------------------------- |
| Create .env     | `touch .env` |
| Edit .env       | `open .env` |
| Configure |<code>ROCKETCHAT_USER="mybot"<br>ROCKETCHAT_PASSWORD="mybotpassword"<br>LISTEN_ON_ALL_PUBLIC=true<br>RESPOND_TO_DM=true<br>RESPOND_TO_EDITED=true</code>|
| Run from source | `yarn local -m rocketchat` |
