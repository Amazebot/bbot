'use strict'

console.log(`\x1b[35m
 __   __   __  ___     ___                 __        ___  __  
|__) |__) /  \\  |     |__  \\_/  /\\   |\\/| |__) |    |__  /__\` 
|__) |__) \\__/  |     |___ / \\ /~~\\  |  | |    |___ |___ .__/ \x1b[0m`)

// Get last execution argument.
// e.g. ['node', 'index.js', 'foo']
const example = process.argv.pop()

require(`./${example}`)
