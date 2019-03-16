function headerLog({ name, configs }) {
  console.log(`\x1b[34m                                                             

${name || 'bBot Example'}

Important config/defaults (see adapter readme for more):\x1b[0m
`)
  console.table(configs)
  console.log('                                                             ')
}

module.exports = {
  headerLog
}
