const HID = require('node-hid')
const { EventEmitter } = require('events')

// Vendor id and product id for current headset
const VENDOR_ID = 12309
const PRODUCT_ID = 17

// List of buffers known to be received from the headset
const CMD_PLACED_ON_CRADDLE = [ 0x01, 0xff, 0x30 ].join()
const CMD_REMOVED_FROM_CRADLE = [ 0x01, 0xff, 0x40 ].join()
const CMD_HOOK_PRESSED = [ 0x06, 0x08 ].join()
const CMD_VOLUME_UP = [ 0x06, 0x01 ].join()
const CMD_VOLUME_DOWN = [ 0x06, 0x02 ].join()
const CMD_GENERIC_BUTTON_PRESS = [ 0x06, 0x00 ].join()

// Events
const EVT_PLACED_ON_CRADDLE = 'placed-on-cradle'
const EVT_REMOVED_FROM_CRADLE = 'removed-from-cradle'
const EVT_HOOK_PRESSED = 'hook'
const EVT_VOLUME_UP = 'volume-up'
const EVT_VOLUME_DOWN = 'volume-down'
const EVT_GENERIC_BUTTON_PRESS = 'button-pressed'

const eventEmitter = new EventEmitter()
const onData = data => {
  const command = data && data.join()
  switch (command) {
    case CMD_PLACED_ON_CRADDLE:
      console.log('Placed on cradle')
      eventEmitter.emit(EVT_PLACED_ON_CRADDLE)
      break
    case CMD_REMOVED_FROM_CRADLE:
      console.log('Removed from cradle')
      eventEmitter.emit(EVT_REMOVED_FROM_CRADLE)
      break
    case CMD_HOOK_PRESSED:
      console.log('Hook pressed')
      eventEmitter.emit(EVT_HOOK_PRESSED)
      break
    case CMD_VOLUME_UP:
      console.log('Volume up')
      eventEmitter.emit(EVT_VOLUME_UP)
      break
    case CMD_VOLUME_DOWN:
      console.log('Volume down')
      eventEmitter.emit(EVT_VOLUME_DOWN)
      break
    case CMD_GENERIC_BUTTON_PRESS:
      // This is usually received after any
      // button press, no particular meaning
      eventEmitter.emit(EVT_GENERIC_BUTTON_PRESS)
      break
    default:
      console.log('Unidentified data')
      break
  }
}

// Print devices
const deviceList = HID.devices(VENDOR_ID, PRODUCT_ID)
console.log(deviceList)

// Connect to all devices. This is necessary because the headset
// presents itself as 4 different devices, each sending different signals
const deviceConnections = []
deviceList.map(deviceInfo => deviceInfo.path).forEach(path => {
  const device = new HID.HID(path)
  device.on('data', onData)
  deviceConnections.push(device)
})

module.exports = eventEmitter
