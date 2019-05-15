
// Custom Matching

// Respond only on Wednesdays (with branch ID)
bot.global.custom((message) => {
  if (new Date().getDay() !== 3) return false
  else return /hello/i.test(message.toString())
}, (b) => b.respond('Hello!'), {
  id: 'wednesday-hello'
})

// Force Matching

// React when someone says hi or hello
bot.global.text({
  contains: [ 'hi', 'hello' ]
}, (b) => b.respondVia('react', ':wave:'), {
  id: 'hello-react'
})

// Add another emoji to reaction when text contains "baby"
bot.global.text({
  contains: 'baby'
}, (b) => b.respondVia('react', ':baby:'), {
  id: 'baby-react', force: true
})
