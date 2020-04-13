const headset = require('./Headset')
const {
  READ_COMMANDS,
  WRITE_COMMANDS,
  EVENTS,
  DEFAULT_CONNECTION_POLLING_MILLISECONDS,
  RINGING_DEVICE_USAGE_PAGE
} = require('./Headset')

jest.useFakeTimers()

describe('Headset class', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('methods', () => {
    describe('removeDevice', () => {
      const usagePage = '12345'
      const deviceConnection = {
        removeAllListeners: jest.fn(),
        close: jest.fn()
      }

      beforeAll(() => {
        headset.deviceConnections[usagePage] = deviceConnection
      })

      afterEach(() => {
        deviceConnection.removeAllListeners.mockClear()
        deviceConnection.close.mockClear()
      })

      afterAll(() => {
        delete headset.deviceConnections[usagePage]
      })

      it('removes listeners and closes device', () => {
        headset.removeDevice(usagePage)
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledWith('data')
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledWith(
          'error'
        )
        expect(deviceConnection.removeAllListeners).toHaveBeenCalledTimes(2)
        expect(deviceConnection.close).toHaveBeenCalled()
      })
    })

    describe('onData', () => {
      it('emits off hook', done => {
        headset.once(EVENTS.OFF_HOOK, () => done())
        headset.onData(READ_COMMANDS.OFF_HOOK)
      })
      it('emits on hook', done => {
        headset.once(EVENTS.ON_HOOK, () => done())
        headset.onData(READ_COMMANDS.ON_HOOK)
      })
      it('emits placed on craddle', done => {
        headset.once(EVENTS.PLACED_ON_CRADLE, () => done())
        headset.onData(READ_COMMANDS.PLACED_ON_CRADLE)
      })
      it('emits removed from craddle', done => {
        headset.once(EVENTS.REMOVED_FROM_CRADLE, () => done())
        headset.onData(READ_COMMANDS.REMOVED_FROM_CRADLE)
      })
      it('emits volume up', done => {
        headset.once(EVENTS.VOLUME_UP, () => done())
        headset.onData(READ_COMMANDS.VOLUME_UP)
      })
      it('emits volume down', done => {
        headset.once(EVENTS.VOLUME_DOWN, () => done())
        headset.onData(READ_COMMANDS.VOLUME_DOWN)
      })
    })

    describe('onError', () => {
      const devicePath = 'some-device-path'
      const usagePage = '12345'
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
        headset.onError(devicePath, usagePage)
        expect(headset.removeDevice).toHaveBeenCalledWith(usagePage)
        expect(headset.reconnectDevice).toHaveBeenCalledWith(devicePath, usagePage)
      })
    })

    describe('onDeviceConnectError', () => {
      const devicePath = 'some-device-path'
      const usagePage = '12345'
      const errorMessage = 'some-error-message'
      const error = new Error(errorMessage)
      it('sets timeout for reconnection', () => {
        headset.onDeviceConnectError(devicePath, usagePage, error)
        expect(setTimeout).toHaveBeenCalledWith(
          expect.any(Function),
          DEFAULT_CONNECTION_POLLING_MILLISECONDS
        )
        expect(headset.deviceReconnectionTimeouts[devicePath]).toBeDefined()
        delete headset.deviceReconnectionTimeouts[devicePath]
      })
    })

    describe('writing to device', () => {
      const deviceConnection = {
        write: jest.fn(),
        _paused: false
      }
      headset.deviceConnections[RINGING_DEVICE_USAGE_PAGE] = deviceConnection

      afterEach(() => deviceConnection.write.mockClear())

      describe('inboundCall', () => {
        it('writes the appropriate command', () => {
          headset.inboundCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS.INBOUND_CALL)
        })
      })

      describe('onCall', () => {
        it('writes the appropriate command', () => {
          headset.onCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS.ON_CALL)
        })
      })

      describe('finishCall', () => {
        it('writes the appropriate command', () => {
          headset.finishCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS.FINISH_CALL)
        })
      })
    })
  })
})
