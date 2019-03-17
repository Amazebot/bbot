# bBot Branches (basic)

This example gives an introduction to using the variety of `branches` which
listen and respond for different types of input from users.

Run it from the root of the repo, with `yarn example basic-branches`

## Text Branches

`text` branches simply respond when input matches a text pattern. e.g.

```js
bot.global.text(/(hi|hello) bots/, (b) => b.respond('Hello 👋'))
```

Test with:

> Hello bots!
