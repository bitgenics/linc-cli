#!/usr/bin/env node

const flows = require('./index')

const run = async () => {
  const cmd = process.argv[2] || 'build'
  const options = process.argv.slice(3)

  try {
    switch (cmd.toLowerCase()) {
      case 'init':
        await flows.init.run()
        break
      default:
        console.log('That is not a valid command')
    }
  } catch (e) {
    console.log('An error occured: \n')
    console.log(e.message)
    console.log('\n')
    process.exit(-1)
  }
}

run()
