const clear = require('clear')
const chalk = require('chalk')
const figlet = require('figlet')
const prompts = require('prompts')
const { commandDescription } = require('../util')
const headset = require('../../Headset')
const { WRITE_COMMANDS, EVENTS } = require('../../lib/settings')

const continuePrompt = {
  type: 'invisible',
  name: 'continue',
  message: 'Monitoring headset, press return to continue...\n',
  initial: true
}

const OPTIONS = Object.freeze({
  PING: 'ping',
  RING_ON_INDICATION: 'ring-on',
  RING_OFF_INDICATION: 'ring-off',
  HOOK_ON_INDICATION: 'hook-on',
  HOOK_OFF_INDICATION: 'hook-off',
  MUTE_OFF_INDICATION: 'mute-off',
  EMULATE_INCOMING_CALL: 'emulate-incoming-call',
  CLOSE: 'close'
})

const commandPrompt = {
  type: 'select',
  name: 'command',
  message: 'Send a command to the headset RTX7113',
  choices: [
    {
      title: 'Ping Headset',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].PING),
      value: OPTIONS.PING
    },
    {
      title: 'Ring on (indication)',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].RING_ON_INDICATION),
      value: OPTIONS.RING_ON_INDICATION
    },
    {
      title: 'Ring off (indication)',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].RING_OFF_INDICATION),
      value: OPTIONS.RING_OFF_INDICATION
    },
    {
      title: 'Hook on (indication)',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].HOOK_ON_INDICATION),
      value: OPTIONS.HOOK_ON_INDICATION
    },
    {
      title: 'Hook off (indication)',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].HOOK_OFF_INDICATION),
      value: OPTIONS.HOOK_OFF_INDICATION
    },
    {
      title: 'Mute off (indication)',
      description: commandDescription(WRITE_COMMANDS['RTX7113'].MUTE_OFF_INDICATION),
      value: OPTIONS.MUTE_OFF_INDICATION
    },
    {
      title: 'Emulate incoming call',
      description: 'Emulate incoming call',
      value: OPTIONS.EMULATE_INCOMING_CALL
    },
    {
      title: 'Exit',
      description: 'Close the application',
      value: OPTIONS.CLOSE
    }
  ]
}

const getRTX7113Menu = () => {
  clear()
  console.log(
    chalk.yellow(
      figlet.textSync('Sangoma Headset', { horizontalLayout: 'full' })
    )
  )
  return prompts(commandPrompt)
    .then(({ command }) => {
      // logger.log('commandPrompt: ', command);
      switch (command) {
        case OPTIONS.PING:
          headset.ping()
          console.log(chalk.green('Ping...'))
          break
        
        case OPTIONS.RING_ON_INDICATION:
          headset.ringOn()
          console.log(chalk.green('Ring on...'))
          break
        
        case OPTIONS.RING_OFF_INDICATION:
          headset.ringOff()
          console.log(chalk.green('Ring off...'))
          break
        
        case OPTIONS.HOOK_ON_INDICATION:
          headset.hookOn()
          console.log(chalk.green('Hook on...'))
          break
        
        case OPTIONS.HOOK_OFF_INDICATION:
          headset.hookOff()
          console.log(chalk.green('Hook off...'))
          break
        
        case OPTIONS.MUTE_OFF_INDICATION:
          headset.muteOff()
          console.log(chalk.green('Mute off...'))
          break

        case OPTIONS.EMULATE_INCOMING_CALL:
          emulateIncomingCall()
          console.log(chalk.green('Emulate incoming callMute off...'))
          break

        case OPTIONS.CLOSE:
          headset.close()
          process.exit(0)

        default:
          console.log(chalk.red('Please select a valid command'))
          break
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
      return getRTX7113Menu()
    })
}


const emulateIncomingCall = () => {
  headset.ringOn()
  headset.on(EVENTS['RTX7113'].HOOK_OFF_REQUESTED, () => {
    console.log(chalk.green('EmulateIncomingCall: '), 'rtx-hook-off-requested (answers call)')
    // when hook off is received, should indicate to hook off and ring off
    headset.hookOff()
    headset.ringOff()
  })

  headset.on(EVENTS['RTX7113'].HOOK_ON_REQUESTED, () => {
    console.log(chalk.green('EmulateIncomingCall: '), 'rtx-hook-on-requested (end call)')
    // when hook on is received, should indicate to hook on
    headset.hookOn()
  })

  headset.on(EVENTS['RTX7113'].MUTE_ON_REQUESTED, () => {
    console.log(chalk.green('EmulateIncomingCall: '), 'rtx-mute-on-requested (in a call)')
    // Important to send the indication back to the headset, otherwise it will kepp requesting
    headset.muteOn()
  })

  headset.on(EVENTS['RTX7113'].MUTE_OFF_REQUESTED, () => {
    console.log(chalk.green('EmulateIncomingCall: '), 'rtx-mute-off-requested (in a call)')
    // Important to send the indication back to the headset, otherwise it will kepp requesting
    headset.muteOff()
  })

}
module.exports.getRTX7113Menu = getRTX7113Menu