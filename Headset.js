const HID = require('node-hid')
const { EventEmitter } = require('events')
const logger = require('./lib/Logger')
const { isMac, fillCommand } = require('./lib/util')
const { MODELS, READ_COMMANDS, WRITE_COMMANDS, EVENTS, HEX_MODELS } = require('./lib/settings')

// Polling USB devices is expensive, defaulting to 5s for now
const DEFAULT_CONNECTION_POLLING_MILLISECONDS = 10000

class Headset extends EventEmitter {
  constructor() {
    super()
    this.deviceList = []
    this.deviceConnections = {}
    this.initialConnectionPollingTimeout = null
    this.deviceReconnectionTimeouts = {}
    this.model = null
    this.ringingDeviceUsagePage = null
  }
  
  // 3015:0011 comes from the DSP
  // 3015 is the vendor id and 0011 is the product id of H20 (default headset)
  dspConnect (hexModel = '3015:0011') {
    if (!HEX_MODELS[hexModel]) {
      logger.log(`No headset model was found for ${hexModel}`)
      return false
    }
    this.connect(HEX_MODELS[hexModel])
  }

  // default model: H20 
  connect (model = 'H20') {
    this.close() // close first
    this.model = model
    logger.log('>>> Headset.connect(): ', this.model);
    this.ringingDeviceUsagePage = isMac() ?
      MODELS[this.model].RINGING_DEVICE_USAGE_PAGE_MAC : MODELS[this.model].RINGING_DEVICE_USAGE_PAGE_WIN
    // Print devices
    this.deviceList = HID.devices(MODELS[this.model].VENDOR_ID, MODELS[this.model].PRODUCT_ID) || []
    if (!this.deviceList || !this.deviceList.length) {
      logger.log(
        `Retrying sangoma headset ${model} connection in ${DEFAULT_CONNECTION_POLLING_MILLISECONDS}ms`
      )
      // TODO: after some retries it should stop trying to reconnect
      this.initialConnectionPollingTimeout = setTimeout(
        this.connect.bind(this, model),
        DEFAULT_CONNECTION_POLLING_MILLISECONDS
      )
      return
    }

    // Connect to all devices. This is necessary because the headset
    // presents itself as 4 different devices, each sending different signals
    this.deviceList.map(deviceInfo => {
      const { path, usagePage } = deviceInfo
      try {
        const deviceConnection = new HID.HID(path)
        deviceConnection.on('data', this.onData.bind(this))
        deviceConnection.on('error', this.onError.bind(this, path, usagePage))
        deviceConnection.setNonBlocking(true)
        this.deviceConnections[usagePage] = deviceConnection
      } catch (e) {
        this.onDeviceConnectError(path, usagePage, e)
      }
    })
  }

  close() {
    // Make sure we clear reconnection timeouts
    if (this.initialConnectionPollingTimeout) {
      clearTimeout(this.initialConnectionPollingTimeout)
    }
    for (let devicePath in this.deviceReconnectionTimeouts) {
      clearTimeout(this.deviceReconnectionTimeouts[devicePath])
    }

    // Close existing device connections
    for (let devicePath in this.deviceConnections) {
      this.removeDevice(devicePath)
      logger.log(`${devicePath}: Removed device`)
    }
  }

  reconnectDevice(devicePath, usagePage) {
    // Clear timeout first to avoid multiple reconnections
    if (this.deviceReconnectionTimeouts[devicePath]) {
      clearTimeout(this.deviceReconnectionTimeouts[devicePath])
      delete this.deviceReconnectionTimeouts[devicePath]
    }

    try {
      const deviceConnection = new HID.HID(devicePath)
      deviceConnection.on('data', this.onData.bind(this))
      deviceConnection.on('error', this.onError.bind(this, devicePath))
      this.deviceConnections[usagePage] = deviceConnection
      logger.log(`${devicePath}: Reconnected`)
    } catch (e) {
      this.onDeviceConnectError(devicePath, usagePage, e)
    }
  }

  removeDevice(usagePage) {
    // Try to close and delete from device connections
    if (this.deviceConnections[usagePage]) {
      try {
        this.deviceConnections[usagePage].removeAllListeners('data')
        this.deviceConnections[usagePage].removeAllListeners('error')
        this.deviceConnections[usagePage].close()
      } catch (e) {
        logger.error(`${usagePage}: ${e && e.message}`)
      }
      delete this.deviceConnections[usagePage]
    }
  }

  onData (data) {
    let command = data && data.join()
    if (!command) return
    const rawCommand = data.toString('hex')
    if (this.model != 'H20') {
      // When using RTX, is apparently safe to remove the 5th byte because it's always changing
      command = data.slice(0,4).join() + ',' + data.slice(5).join()
    }    
    let filledCommand = ''
    // This replaces the switch/cases
    for (let eventName in EVENTS[this.model]) {
      if (eventName === 'RAW_COMMAND') continue
      if (this.model === 'H20') {
        // TODO: Maybe not compatible with H20
        filledCommand = READ_COMMANDS[this.model][eventName]
      } else { // for RTX models
        filledCommand = fillCommand(READ_COMMANDS[this.model][eventName], (rawCommand.length - 2)/2, 0x00)
      }
      if (filledCommand && command === filledCommand.join()) {
        // return this.emit(EVENTS[this.model][eventName])
        logger.log('Headset.onData (event): ', EVENTS[this.model][eventName]);
        return this.emit(EVENTS[this.model][eventName])
      }
    }
    // when command isn't recognized in previous steps, emit as Raw command
    logger.log('Headset.onData (rawCommand): ', rawCommand);
    return this.emit(EVENTS[this.model].RAW_COMMAND, rawCommand)
  }

  inboundCall () {
    if (this.model === 'H20') {
      this.invoke('inboundCall', WRITE_COMMANDS[this.model].INBOUND_CALL, 'startRinging')
    } else {
      logger.log('>>> Headset.inboundCall() => ringOn()')
      this.ringOn() // assumes RTX
    }
  }

  onCall () {
    if (this.model === 'H20') {
      this.invoke('onCall', WRITE_COMMANDS[this.model].ON_CALL, 'startRinging')
    } else {
      logger.log('onCall(): not H20') // assumes RTX
    }
  }

  finishCall () {
    if (this.model === 'H20') {
      this.invoke('finishCall', WRITE_COMMANDS[this.model].FINISH_CALL, 'stopRinging')
    } else {
      logger.log('finishCall(): not H20') // assumes RTX
    }
  }

  mute () {
    if (this.model === 'H20') {
      this.invoke('mute', WRITE_COMMANDS[this.model].MUTE, 'mute')
    } else {
      logger.log('mute(): not H20') // assumes RTX
    }
  }

  unmute () {
    if (this.model === 'H20') {
      this.invoke('unmute', WRITE_COMMANDS[this.model].UNMUTE, 'mute')
    } else {
      logger.log('unmute(): not H20') // assumes RTX
    }
  }

  // RTX Models (indications) PC -> headset
  ping () {
    this.invoke('ping', WRITE_COMMANDS[this.model].PING, 'ping')
  }
  
  ringOn () {
    this.invoke('ring on', WRITE_COMMANDS[this.model].RING_ON_INDICATION, 'ring on indication')
  }

  ringOff () {
    this.invoke('ring off', WRITE_COMMANDS[this.model].RING_OFF_INDICATION, 'ring off indication')
  }

  hookOn () {
    this.invoke('hook on', WRITE_COMMANDS[this.model].HOOK_ON_INDICATION, 'hook on indication')
  }

  hookOff () {
    this.invoke('hook off', WRITE_COMMANDS[this.model].HOOK_OFF_INDICATION, 'hook off indication')
  }

  muteOff () {  
    this.invoke('mute off', WRITE_COMMANDS[this.model].MUTE_OFF_INDICATION, 'mute off indication')
  }

  muteOn () {  
    this.invoke('mute on', WRITE_COMMANDS[this.model].MUTE_ON_INDICATION, 'mute on indication')
  }

  invoke (method, command, alias) {
    const deviceConnection = this.deviceConnections[this.ringingDeviceUsagePage]
    if (deviceConnection && !deviceConnection._paused) {
      try {
        deviceConnection.write(command)
      } catch (e) {
        logger.error(method, alias, 'could not write to device', e.message)
      }
    }
  }

  onError(devicePath, usagePage, error) {
    logger.error(devicePath, error && error.message)

    // Remove device
    this.removeDevice(usagePage)

    // Try to connect to device again
    this.reconnectDevice(devicePath, usagePage)
  }

  onDeviceConnectError(devicePath, usagePage, error) {
    logger.error(devicePath + ':', error && error.message)
    this.deviceReconnectionTimeouts[devicePath] = setTimeout(
      this.reconnectDevice.bind(this, devicePath, usagePage),
      DEFAULT_CONNECTION_POLLING_MILLISECONDS
    )
    logger.log(
      `${devicePath}: Trying to reconnect in ${DEFAULT_CONNECTION_POLLING_MILLISECONDS}ms`
    )
  }
}

module.exports = new Headset()
module.exports.DEFAULT_CONNECTION_POLLING_MILLISECONDS = DEFAULT_CONNECTION_POLLING_MILLISECONDS