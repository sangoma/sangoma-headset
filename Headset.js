const HID = require('node-hid')
const { EventEmitter } = require('events')

// Vendor id and product id for current headset
const HEADSET_VENDOR_ID = 12309
const HEADSET_PRODUCT_ID = 17

// List of buffers known to be received from the headset
const COMMANDS = Object.freeze({
  PLACED_ON_CRADLE: [ 0x01, 0xff, 0x30 ],
  REMOVED_FROM_CRADLE: [ 0x01, 0xff, 0x40 ],
  HOOK_PRESSED: [ 0x06, 0x08 ],
  VOLUME_UP: [ 0x06, 0x01 ],
  VOLUME_DOWN: [ 0x06, 0x02 ],
  GENERIC_BUTTON_PRESS: [ 0x06, 0x00 ]
})

// Events
const EVENTS = Object.freeze({
  PLACED_ON_CRADLE: 'placed-on-cradle',
  REMOVED_FROM_CRADLE: 'removed-from-cradle',
  HOOK_PRESSED: 'hook',
  VOLUME_UP: 'volume-up',
  VOLUME_DOWN: 'volume-down',
  GENERIC_BUTTON_PRESS: 'button-pressed'
})

// Other constants
// Polling USB devices is expensive, defaulting to 5s for now
const DEFAULT_CONNECTION_POLLING_MILLISECONDS = 5000

class Headset extends EventEmitter {
  constructor () {
    super()
    this.deviceList = []
    this.deviceConnections = {}
    this.initialConnectionPollingTimeout = null
    this.deviceReconnectionTimeouts = {}
  }

  connect () {
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
    this.deviceList.map(deviceInfo => deviceInfo.path).forEach(devicePath => {
      try {
        const deviceConnection = new HID.HID(devicePath)
        deviceConnection.on('data', this.onData.bind(this))
        deviceConnection.on('error', this.onError.bind(this, devicePath))
        this.deviceConnections[devicePath] = deviceConnection
      } catch (e) {
        this.onDeviceConnectError(devicePath, e)
      }
    })
  }

  close () {
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

  reconnectDevice (devicePath) {
    // Clear timeout first to avoid multiple reconnections
    if (this.deviceReconnectionTimeouts[devicePath]) {
      clearTimeout(this.deviceReconnectionTimeouts[devicePath])
      delete this.deviceReconnectionTimeouts[devicePath]
    }

    try {
      const deviceConnection = new HID.HID(devicePath)
      deviceConnection.on('data', this.onData.bind(this))
      deviceConnection.on('error', this.onError.bind(this, devicePath))
      this.deviceConnections[devicePath] = deviceConnection
      console.log(`${devicePath}: Reconnected`)
    } catch (e) {
      this.onDeviceConnectError(devicePath, e)
    }
  }

  removeDevice (devicePath) {
    // Try to close and delete from device connections
    if (this.deviceConnections[devicePath]) {
      try {
        this.deviceConnections[devicePath].removeAllListeners('data')
        this.deviceConnections[devicePath].removeAllListeners('error')
        this.deviceConnections[devicePath].close()
      } catch (e) {
        console.error(`${devicePath}: ${e && e.message}`)
      }
      delete this.deviceConnections[devicePath]
    }
  }

  onData (data) {
    const command = data && data.join()
    switch (command) {
      case COMMANDS.PLACED_ON_CRADLE.join():
        console.log('Placed on cradle')
        this.emit(EVENTS.PLACED_ON_CRADLE)
        break
      case COMMANDS.REMOVED_FROM_CRADLE.join():
        console.log('Removed from cradle')
        this.emit(EVENTS.REMOVED_FROM_CRADLE)
        break
      case COMMANDS.HOOK_PRESSED.join():
        console.log('Hook pressed')
        this.emit(EVENTS.HOOK_PRESSED)
        break
      case COMMANDS.VOLUME_UP.join():
        console.log('Volume up')
        this.emit(EVENTS.VOLUME_UP)
        break
      case COMMANDS.VOLUME_DOWN.join():
        console.log('Volume down')
        this.emit(EVENTS.VOLUME_DOWN)
        break
      case COMMANDS.GENERIC_BUTTON_PRESS.join():
        // This is usually received after any
        // button press, no particular meaning
        this.emit(EVENTS.GENERIC_BUTTON_PRESS)
        break
      default:
        console.log('Unidentified data')
        break
    }
  }

  onError (devicePath, error) {
    console.log(devicePath, error && error.message)

    // Remove device
    this.removeDevice(devicePath)

    // Try to connect to device again
    this.reconnectDevice(devicePath)
  }

  onDeviceConnectError (devicePath, error) {
    console.error(devicePath + ':', error && error.message)
    this.deviceReconnectionTimeouts[devicePath] = setTimeout(
      this.reconnectDevice.bind(this, devicePath),
      DEFAULT_CONNECTION_POLLING_MILLISECONDS
    )
    console.log(
      `${devicePath}: Trying to reconnect in ${DEFAULT_CONNECTION_POLLING_MILLISECONDS}ms`
    )
  }
}

module.exports = new Headset()
module.exports.COMMANDS = COMMANDS
module.exports.EVENTS = EVENTS
