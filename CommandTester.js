const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const prompts = require('prompts')
const headset = require('./Headset')
const { EVENTS, WRITE_COMMANDS } = require('./Headset')

headset.connect()

const COMMANDS = Object.freeze({
  INCOMING_CALL: 'incoming-call',
  ON_CALL: 'on-call',
  END_CALL: 'end-call',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  CLOSE: 'close'
})

const commandPrompt = {
  type: 'select',
  name: 'command',
  message: 'Send a command to the headset',
  choices: [
    {
      title: 'Incoming call',
      description: WRITE_COMMANDS.INBOUND_CALL
        .map(num => num.toString(16).padStart(2, '0'))
        .join(' '),
      value: COMMANDS.INCOMING_CALL
    },
    {
      title: 'On call',
      description: WRITE_COMMANDS.ON_CALL
        .map(num => num.toString(16).padStart(2, '0'))
        .join(' '),
      value: COMMANDS.ON_CALL
    },
    {
      title: 'Mute',
      description: WRITE_COMMANDS.MUTE
        .map(num => num.toString(16).padStart(2, '0'))
        .join(' '),
      value: COMMANDS.MUTE
    },
    {
      title: 'Unmute',
      description: WRITE_COMMANDS.UNMUTE
        .map(num => num.toString(16).padStart(2, '0'))
        .join(' '),
      value: COMMANDS.UNMUTE
    },
    {
      title: 'Finish call',
      description: WRITE_COMMANDS.FINISH_CALL
        .map(num => num.toString(16).padStart(2, '0'))
        .join(' '),
      value: COMMANDS.END_CALL
    },
    {
      title: 'Exit',
      description: 'Close the application',
      value: COMMANDS.CLOSE
    }
  ]
}

const continuePrompt = {
  type: 'invisible',
  name: 'continue',
  message: 'Monitoring headset, press return to continue...\n',
  initial: true
}

let currentPrompt = null
const getCommand = () => {
  clear()
  console.log(
    chalk.yellow(
      figlet.textSync('Sangoma Headset', { horizontalLayout: 'full' })
    )
  )
  return prompts(commandPrompt)
    .then(({ command }) => {
      switch (command) {
        case COMMANDS.INCOMING_CALL: {
          headset.inboundCall()
          console.log(chalk.green('Incoming call...'))
          break
        }
        case COMMANDS.ON_CALL: {
          headset.onCall()
          console.log(chalk.green('On call...'))
          break
        }
        case COMMANDS.MUTE: {
          headset.mute()
          console.log(chalk.green('Mute...'))
          break
        }
        case COMMANDS.UNMUTE: {
          headset.unmute()
          console.log(chalk.green('Unmute...'))
          break
        }
        case COMMANDS.END_CALL: {
          headset.finishCall()
          console.log(chalk.green('Finish call...'))
          break
        }
        case COMMANDS.CLOSE: {
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
      return getCommand()
    })
}

headset.on(EVENTS.RAW_COMMAND, command => {
  console.log(chalk.yellow('Headset raw command: '), command)
})
for (let eventName in EVENTS) {
  if (EVENTS[eventName] === EVENTS.RAW_COMMAND) {
    continue
  }
  headset.on(EVENTS[eventName], () => {
    console.log(
      chalk.green('Headset connector emits known event: '),
      EVENTS[eventName]
    )
  })
}

// Start getting commands
getCommand()
