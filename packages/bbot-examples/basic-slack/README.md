[adapter]: https://github.com/Amazebot/bbot/tree/master/packages/bbot-message-slack

# Slack message adapter (basic)

## Important Configs

| Env var                   | Defaults                  |
| ------------------------- | ------------------------- |
| `BOT_USE_SERVER`          | `false`                   |
| `BOT_MESSAGE_ADAPTER`     | `bbot-message-slack`      |
| `SLACK_USER_TOKEN`        | `undefined`               |

- Defaults comes from example's `.env` file.
- Add an app with "Bots" functionality and bot user to your workspace.
- Use the "Bot User OAuth Access Token" as above `SLACK_USER_TOKEN`
- Bot server disabled to simplify environment for basic example.
