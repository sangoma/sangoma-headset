const HID = require('node-hid')
const { EventEmitter } = require('events')

// Behavior is a bit different between mac and windows
const isMac = () => {
  const isMac = /^darwin/.test(process.platform)
  return isMac
}

// Vendor id and product id for current headset
const HEADSET_VENDOR_ID = 12309
const HEADSET_PRODUCT_ID = 17

// Usage page for ringing device (Windows)
const RINGING_DEVICE_USAGE_PAGE = isMac() ? '65280' : '11'

// List of buffers known to be received from the headset
const READ_COMMANDS = Object.freeze({
  OFF_HOOK: [0x04, 0x02],
  ON_HOOK: [0x04, 0x00],
  PLACED_ON_CRADLE: [0x01, 0xff, 0x30],
  REMOVED_FROM_CRADLE: [0x01, 0xff, 0x40],
  PLAY_PAUSE_PRESSED: [0x06, 0x08],
  VOLUME_UP: [0x06, 0x01],
  VOLUME_DOWN: [0x06, 0x02],
  GENERIC_BUTTON_PRESS: [0x06, 0x00]
})

const WRITE_COMMANDS = Object.freeze({
  INBOUND_CALL: [0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ON_CALL: [0x05, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  FINISH_CALL: [0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
})

// Events
const EVENTS = Object.freeze({
  OFF_HOOK: 'off-hook',
  ON_HOOK: 'on-hook',
  PLACED_ON_CRADLE: 'placed-on-cradle',
  REMOVED_FROM_CRADLE: 'removed-from-cradle',
  PLAY_PAUSE_PRESSED: 'play-pause',
  VOLUME_UP: 'volume-up',
  VOLUME_DOWN: 'volume-down',
  GENERIC_BUTTON_PRESS: 'button-pressed'
})

// Other constants
// Polling USB devices is expensive, defaulting to 5s for now
const DEFAULT_CONNECTION_POLLING_MILLISECONDS = 10000

class Headset extends EventEmitter {
  constructor() {
    super()
    this.deviceList = []
    this.deviceConnections = {}
    this.initialConnectionPollingTimeout = null
    this.deviceReconnectionTimeouts = {}
  }

  connect() {
    // Print devices
    this.deviceList = HID.devices(HEADSET_VENDOR_ID, HEADSET_PRODUCT_ID) || []
    console.log(this.deviceList)
    if (!this.deviceList || !this.deviceList.length) {
      console.log(
        `Retrying sangoma headset connection in ${DEFAULT_CONNECTION_POLLING_MILLISECONDS}ms`
      )
      this.initialConnectionPollingTimeout = setTimeout(
        this.connect.bind(this),
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
      console.log(`${devicePath}: Removed device`)
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
      console.log(`${devicePath}: Reconnected`)
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
        console.error(`${usagePage}: ${e && e.message}`)
      }
      delete this.deviceConnections[usagePage]
    }
  }

  onData(data) {
    const command = data && data.join()
    switch (command) {
      case READ_COMMANDS.OFF_HOOK.join():
        console.log('Off hook')
        this.emit(EVENTS.OFF_HOOK)
        break
      case READ_COMMANDS.ON_HOOK.join():
        console.log('On hook')
        this.emit(EVENTS.ON_HOOK)
        break
      case READ_COMMANDS.PLACED_ON_CRADLE.join():
        console.log('Placed on cradle')
        this.emit(EVENTS.PLACED_ON_CRADLE)
        break
      case READ_COMMANDS.REMOVED_FROM_CRADLE.join():
        console.log('Removed from cradle')
        this.emit(EVENTS.REMOVED_FROM_CRADLE)
        break
      case READ_COMMANDS.PLAY_PAUSE_PRESSED.join():
        console.log('Play/Pause pressed')
        this.emit(EVENTS.PLAY_PAUSE_PRESSED)
        break
      case READ_COMMANDS.VOLUME_UP.join():
        console.log('Volume up')
        this.emit(EVENTS.VOLUME_UP)
        break
      case READ_COMMANDS.VOLUME_DOWN.join():
        console.log('Volume down')
        this.emit(EVENTS.VOLUME_DOWN)
        break
      case READ_COMMANDS.GENERIC_BUTTON_PRESS.join():
        // This is usually received after any
        // button press, no particular meaning
        this.emit(EVENTS.GENERIC_BUTTON_PRESS)
        break
      default:
        // Unidentified data
        break
    }
  }

  inboundCall () {
    const deviceConnection = this.deviceConnections[RINGING_DEVICE_USAGE_PAGE]
    if (deviceConnection && !deviceConnection._paused) {
      try {
        deviceConnection.write(WRITE_COMMANDS.INBOUND_CALL)
      } catch (e) {
        console.error('startRinging', 'could not write to device', e.message)
      }
    }
  }

  onCall () {
    const deviceConnection = this.deviceConnections[RINGING_DEVICE_USAGE_PAGE]
    if (deviceConnection && !deviceConnection._paused) {
      try {
        deviceConnection.write(WRITE_COMMANDS.ON_CALL)
      } catch (e) {
        console.error('startRinging', 'could not write to device', e.message)
      }
    }
  }

  finishCall () {
    const deviceConnection = this.deviceConnections[RINGING_DEVICE_USAGE_PAGE]
    if (deviceConnection && !deviceConnection._paused) {
      try {
        deviceConnection.write(WRITE_COMMANDS.FINISH_CALL)
      } catch (e) {
        console.error('stopRinging', 'could not write to device', e.message)
      }
    }
  }

  onError(devicePath, usagePage, error) {
    console.log(devicePath, error && error.message)

    // Remove device
    this.removeDevice(usagePage)

    // Try to connect to device again
    this.reconnectDevice(devicePath, usagePage)
  }

  onDeviceConnectError(devicePath, usagePage, error) {
    console.error(devicePath + ':', error && error.message)
    this.deviceReconnectionTimeouts[devicePath] = setTimeout(
      this.reconnectDevice.bind(this, devicePath, usagePage),
      DEFAULT_CONNECTION_POLLING_MILLISECONDS
    )
    console.log(
      `${devicePath}: Trying to reconnect in ${DEFAULT_CONNECTION_POLLING_MILLISECONDS}ms`
    )
  }
}

module.exports = new Headset()
module.exports.READ_COMMANDS = READ_COMMANDS
module.exports.WRITE_COMMANDS = WRITE_COMMANDS
module.exports.EVENTS = EVENTS
module.exports.DEFAULT_CONNECTION_POLLING_MILLISECONDS = DEFAULT_CONNECTION_POLLING_MILLISECONDS
module.exports.RINGING_DEVICE_USAGE_PAGE = RINGING_DEVICE_USAGE_PAGE
module.exports.isMac = isMac
