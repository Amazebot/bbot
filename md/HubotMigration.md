[thought]: ./ThoughtProcess.md

Add note this a guide for script developers. To see a feature comparison, go here ... <LINK TO ENGINEERING SECTION>

Requiring/importing the bot...

Async all the things

Logging and error handling

Coffee -> ES2015 -> Typescript

^^^

## Hearing and Listening

`listen`, `hear` and `respond` methods have counterparts within bBot but they
work slightly differently and we've attempted to find more semantic naming.

### Hear ➡️ ListenText
- In **Hubot** `hear` adds a text pattern listener.
- In **bBot** `listenText` does the same, where `hear` is the [process][thought]
  which determines if incoming messages will be given to listeners.

### Respond ➡️ ListenDirect
- In **Hubot** `respond` add a text pattern listener that will only match if
  prefixed with the bot's name.
- In **bBot** `listenDirect` does the same.

### Listen ➡️ ListenCustom
- In **Hubot** `listen` is a sort of abstract for both `hear` and `respond`.
- In **bBot** `listen` is the [process][thought] which provides messages to each
listener. `listenCustom` can be used to create a listener with a custom matching
function.

### Example

Hubot
```js
module.exports = (robot) => robot.hear(/.*/, () => console.log('I hear!'))
```

bBot
```js
export default (bot) => bot.listenText(/.*/, () => console.log('I listen!'))
```
