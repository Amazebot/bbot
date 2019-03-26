[branches]: http://bbot.chat/docs/branches
[dialogues]: http://bbot.chat/docs/dialogues
[conditions]: http://bbot.chat/docs/conditions

# bBot Branches (basic)

This example gives an introduction to using the variety of `branches` which
listen and respond for different types of input from users.

## Text Branches

Text branches simply respond when input matches a text pattern.
[Learn more about branches.][branches] e.g.

```js
bot.branches.text(/(hi|hello) bots/, (b) => b.respond('Hello 👋'))
```

Test with "Hello bots!".

## Text Branch Conditions

Text branches also accept conditions objects, providing a simple interface to
create matching patterns.
[Learn more about conditions.][conditions] e.g.

```js
bot.branches.text({
  starts: 'hello',
  contains: 'world'
}, (b) => b.respond('Hello you!'))
```

Test with "Hello world".

## Catching Unmatched Input

Catch branches can be used when no other branch has matched.

```js
bot.branches.text(/match/i, (b) => b.respond('Input matched'))
bot.branches.catch((b) => b.respond('Input did not match'))
```

Test with anything other than "match"

## Contextual Branching

Branches can be created within the context of an active dialogue state, to only
be available following from another branch. It just requires creating the branch
from the state object (`b`) instead of the bot.
[Learn more about dialogues.][dialogues] e.g.

```js
bot.branches.text({ starts: 'help' }, (b) => {
  b.respond('Need some help?')
  b.branches.text({ is: 'yes' }, (b) => 'OK, I will try...')
  b.branches.text({ is: 'no' }, (b) => 'OK, never mind.')
  b.branches.catch((b) => 'Sorry, just say "yes" or "no"')
})
```

Test with "Help!" then either "yes" or "no". Notice that "help" doesn't work
in the context, as yes/no don't work out of context.
