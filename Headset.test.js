const headset = require('./Headset')
const {
  COMMANDS,
  EVENTS,
  DEFAULT_CONNECTION_POLLING_MILLISECONDS
} = require('./Headset')

jest.useFakeTimers()

describe('Headset class', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('methods', () => {
    describe('removeDevice', () => {
      const devicePath = 'some-device-path'
      const deviceConnection = {
        removeAllListeners: jest.fn(),
        close: jest.fn()
      }

      beforeAll(() => {
        headset.deviceConnections[devicePath] = deviceConnection
      })

      afterEach(() => {
        deviceConnection.removeAllListeners.mockClear()
        deviceConnection.close.mockClear()
      })

      afterAll(() => {
        delete headset.deviceConnections[devicePath]
      })

      it('removes listeners and closes device', () => {
        headset.removeDevice(devicePath)
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledWith('data')
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledWith(
          'error'
        )
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledTimes(2)
        expect(deviceConnection.close).toHaveBeenCalled()
      })
    })

    describe('onData', () => {
      it('emits placed on craddle', done => {
        headset.once(EVENTS.PLACED_ON_CRADLE, () => done())
        headset.onData(COMMANDS.PLACED_ON_CRADLE)
      })
      it('emits removed from craddle', done => {
        headset.once(EVENTS.REMOVED_FROM_CRADLE, () => done())
        headset.onData(COMMANDS.REMOVED_FROM_CRADLE)
      })
      it('emits hook pressed', done => {
        headset.once(EVENTS.HOOK_PRESSED, () => done())
        headset.onData(COMMANDS.HOOK_PRESSED)
      })
      it('emits volume up', done => {
        headset.once(EVENTS.VOLUME_UP, () => done())
        headset.onData(COMMANDS.VOLUME_UP)
      })
      it('emits volume down', done => {
        headset.once(EVENTS.VOLUME_DOWN, () => done())
        headset.onData(COMMANDS.VOLUME_DOWN)
      })
      it('emits generic button press', done => {
        headset.once(EVENTS.GENERIC_BUTTON_PRESS, () => done())
        headset.onData(COMMANDS.GENERIC_BUTTON_PRESS)
      })
    })

    describe('onError', () => {
      const devicePath = 'some-device-path'
      const tmpRemoveDevice = headset.removeDevice
      const tmpReconnectDevice = headset.reconnectDevice

      beforeAll(() => {
        headset.removeDevice = jest.fn()
        headset.reconnectDevice = jest.fn()
      })

      afterEach(() => {
        headset.removeDevice.mockClear()
        headset.reconnectDevice.mockClear()
      })

      afterAll(() => {
        headset.removeDevice = tmpRemoveDevice
        headset.reconnectDevice = tmpReconnectDevice
      })

      it('calls removeDevice and reconnectDevice', () => {
        headset.onError(devicePath)
        expect(headset.removeDevice).toHaveBeenCalledWith(devicePath)
        expect(headset.reconnectDevice).toHaveBeenCalledWith(devicePath)
      })
    })

    describe('onDeviceConnectError', () => {
      const devicePath = 'some-device-path'
      const errorMessage = 'some-error-message'
      const error = new Error(errorMessage)
      it('sets timeout for reconnection', () => {
        headset.onDeviceConnectError(devicePath, error)
        expect(setTimeout).toHaveBeenCalledWith(
          expect.any(Function),
          DEFAULT_CONNECTION_POLLING_MILLISECONDS
        )
        expect(headset.deviceReconnectionTimeouts[devicePath]).toBeDefined()
        delete headset.deviceReconnectionTimeouts[devicePath]
      })
    })
  })
})
