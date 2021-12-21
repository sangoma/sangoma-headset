const clear = require('clear')
const chalk = require('chalk')
const figlet = require('figlet')
const prompts = require('prompts')
const { commandDescription } = require('../util')
const headset = require('../../Headset')
const { WRITE_COMMANDS } = require('../../lib/settings')
const logger = require('../Logger')

/*
{
  title: 'Ping',
  description: commandDescription(WRITE_COMMANDS['H20'].PING),
  value: OPTIONS.PING
},
*/

const continuePrompt = {
  type: 'invisible',
  name: 'continue',
  message: 'Monitoring headset, press return to continue...\n',
  initial: true
}

const OPTIONS = Object.freeze({
  INCOMING_CALL: 'incoming-call',
  ON_CALL: 'on-call',
  END_CALL: 'end-call',
  MUTE: 'mute',
  UNMUTE: 'unmute',
  PING: 'ping',
  CLOSE: 'close'
})

const commandPrompt = {
  type: 'select',
  name: 'command',
  message: 'Send a command to the headset H20',
  choices: [
    {
      title: 'Incoming call',
      description: commandDescription(WRITE_COMMANDS['H20'].INBOUND_CALL),
      value: OPTIONS.INCOMING_CALL
    },
    {
      title: 'On call',
      description: commandDescription(WRITE_COMMANDS['H20'].ON_CALL),
      value: OPTIONS.ON_CALL
    },
    {
      title: 'Mute',
      description: commandDescription(WRITE_COMMANDS['H20'].MUTE),
      value: OPTIONS.MUTE
    },
    {
      title: 'Unmute',
      description: commandDescription(WRITE_COMMANDS['H20'].UNMUTE),
      value: OPTIONS.UNMUTE
    },
    {
      title: 'Finish call',
      description: commandDescription(WRITE_COMMANDS['H20'].FINISH_CALL),
      value: OPTIONS.END_CALL
    },
    {
      title: 'Exit',
      description: 'Close the application',
      value: OPTIONS.CLOSE
    }
  ]
}

const getH20Menu = () => {
  clear()
  console.log(
    chalk.yellow(
      figlet.textSync('Sangoma Headset', { horizontalLayout: 'full' })
    )
  )
  return prompts(commandPrompt)
    .then(({ command }) => {
      switch (command) {
        case OPTIONS.INCOMING_CALL: {
          headset.inboundCall()
          console.log(chalk.green('Incoming call...'))
          break
        }
        case OPTIONS.ON_CALL: {
          headset.onCall()
          console.log(chalk.green('On call...'))
          break
        }
        case OPTIONS.MUTE: {
          headset.mute()
          console.log(chalk.green('Mute...'))
          break
        }
        case OPTIONS.UNMUTE: {
          headset.unmute()
          console.log(chalk.green('Unmute...'))
          break
        }
        case OPTIONS.END_CALL: {
          headset.finishCall()
          console.log(chalk.green('Finish call...'))
          break
        }
        case OPTIONS.PING: {
          headset.ping()
          console.log(chalk.green('Ping...'))
          break
        }
        case OPTIONS.CLOSE: {
          headset.close()
          process.exit(0)
        }
        default: {
          console.log(chalk.red('Please select a valid command'))
        }
      }
    })
    .then(res => {
      logger.log(res);
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
      return getH20Menu()
    })
}

module.exports.getH20Menu = getH20Menu