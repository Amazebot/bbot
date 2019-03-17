[adapter]: '../bbot-message-rocketchat/'
[rocket-control]: 'https://github.com/Amazebot/rocket-control'
[rocket-bot]: 'https://github.com/Amazebot/rocket-control/tree/master/packages/bot'

# Rocket.Chat message adapter (basic)

## Important Configs

| Env var                   | Defaults                  |
| ------------------------- | ------------------------- |
| `BOT_USE_SERVER`          | `false`                   |
| `BOT_MESSAGE_ADAPTER`     | `bbot-message-rocketchat` |
| `RC_URL`                  | `localhost:3000`          |
| `RC_USERNAME`             | `bbot`                    |
| `RC_PASSWORD`             | `pass`                    |

- Defaults comes from example's `.env` file.
- Bot user with u:`bbot` p:`pass` needs to be created in RC first.
- Bot server disabled to avoid conflict with Rocket.Chat.

## Links
- [Adapter Source][adapter] for method interfaces.
- [Rocket Bot readme][rocket-bot] for driver details.
- [Rocket Control][rocket-control] for complete utility suite.
