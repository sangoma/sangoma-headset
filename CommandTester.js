const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const prompts = require('prompts')
const headset = require('./Headset')
const { EVENTS } = require('./lib/settings')
const { getH20Menu } = require('./lib/prompts/H20')
const { getRTX7113Menu } = require('./lib/prompts/RTX7113')

const selectHeadsetPrompt = {
  type: 'select',
  name: 'command',
  message: 'Select headset model',
  choices: [
    {
      title: 'RTX7113',
      value: 'RTX7113'
    },
    {
      title: 'RTX7134',
      value: 'RTX7134'
    },
    {
      title: 'H20',
      value: 'H20'
    },
    {
      title: 'Exit',
      value: 'CLOSE'
    }
  ]
}

const continuePrompt = {
  type: 'invisible',
  name: 'continue',
  message: 'Monitoring headset, press return to continue...\n',
  initial: true
}

const displayMainMenu = () => {
  clear()
  console.log(
    chalk.yellow(
      figlet.textSync('Sangoma Headset', { horizontalLayout: 'full' })
    )
  )
  return prompts(selectHeadsetPrompt)
    .then(({ command }) => {
      switch (command) {
        case 'RTX7113': {
          headset.connect('RTX7113')
          setupListeners('RTX7113')
          return getRTX7113Menu()
        }
        case 'RTX7134': {
          headset.connect('RTX7134')
          setupListeners('RTX7134')
          return
        }
        case 'H20': {
          headset.connect('H20')
          setupListeners('H20')
          return getH20Menu()
        }
        case 'CLOSE': {
          headset.close()
          process.exit(0)
        }
        default: {
          console.log(chalk.red('Please select a valid command'))
        }
      }
    })
    .then(() => {
      // Monitor headset and prompt
      clear()
      console.log(
        chalk.yellow(
          figlet.textSync('Sangoma Headset', { horizontalLayout: 'full' })
        )
      )
      return prompts(continuePrompt)
    })
    .then(() => {
      // Get command again
      return displayMainMenu()
    })
}

// this should be inside a function (I guess) with the model as parameter
const setupListeners = (model) => {
  headset.on(EVENTS[model].RAW_COMMAND, command => {
    console.log(chalk.yellow('Headset raw command:'), command)
    // console.log(chalk.yellow('Length:'), command.length) // length is 128 => 64 bytes
  })
  for (let eventName in EVENTS[model]) {
    if (EVENTS[model][eventName] === EVENTS[model].RAW_COMMAND) {
      continue
    }
    headset.on(EVENTS[model][eventName], () => {
      console.log(
        chalk.green('Headset connector emits known event: '), EVENTS[model][eventName]
      )
    })
  }
}

// Display main menu
displayMainMenu()