# bBot Branches (advanced)

This example shows how to use a second argument to define additional options for
your branches. Supported attributes are `id` and `force`, but you can add
anything else you want to use, e.g. to put in state for memory or middleware.

## Branch IDs

Adding an ID makes it easier to debug or change behaviour for specific branches.

```js
bot.global.direct(/branch ID/, (b) => b.respond('👌'), { id: 'example-branch' })
```

Test and look for the ID in the logs.

> bbot branch ID
