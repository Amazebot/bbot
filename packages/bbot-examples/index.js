'use strict'

const { readFileSync } = require('fs')
const { spawn } = require('child_process')
const marked = require('marked')
const TerminalRenderer = require('marked-terminal')
marked.setOptions({ renderer: new TerminalRenderer() })

// Clear and print headers.
console.clear()
console.log(`\x1b[35m
      __   __  ___     ___                 __        ___  __  
|__  |__) /  \\  |     |__  \\_/  /\\   |\\/| |__) |    |__  /__\` 
|__) |__) \\__/  |     |___ / \\ /~~\\  |  | |    |___ |___ .__/ 
_____________________________________________________________
\x1b[0m`)

// Get last execution argument as path.
const example = `${__dirname}/${process.argv.pop()}`

// Render readme to console.
console.log(marked(readFileSync(`${example}/README.md`, { encoding: 'utf8' })))

// Execute start script at example path.
spawn('yarn', ['--silent', 'start'], { cwd: example, stdio: 'inherit' })
