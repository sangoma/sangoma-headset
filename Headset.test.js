const headset = require('./Headset')
const { DEFAULT_CONNECTION_POLLING_MILLISECONDS } = require('./Headset')
const { READ_COMMANDS, WRITE_COMMANDS, EVENTS } = require('./lib/settings')
const MODEL = 'H20'

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
        headset.model = MODEL
        headset.ringingDeviceUsagePage = '11'
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
        headset.once(EVENTS[MODEL].OFF_HOOK, () => done())
        headset.onData(READ_COMMANDS[MODEL].OFF_HOOK)
      })
      it('emits on hook', done => {
        headset.once(EVENTS[MODEL].ON_HOOK, () => done())
        headset.onData(READ_COMMANDS[MODEL].ON_HOOK)
      })
      it('emits placed on craddle', done => {
        headset.once(EVENTS[MODEL].PLACED_ON_CRADLE, () => done())
        headset.onData(READ_COMMANDS[MODEL].PLACED_ON_CRADLE)
      })
      it('emits removed from craddle', done => {
        headset.once(EVENTS[MODEL].REMOVED_FROM_CRADLE, () => done())
        headset.onData(READ_COMMANDS[MODEL].REMOVED_FROM_CRADLE)
      })
      it('emits volume up', done => {
        headset.once(EVENTS[MODEL].VOLUME_UP, () => done())
        headset.onData(READ_COMMANDS[MODEL].VOLUME_UP)
      })
      it('emits volume down', done => {
        headset.once(EVENTS[MODEL].VOLUME_DOWN, () => done())
        headset.onData(READ_COMMANDS[MODEL].VOLUME_DOWN)
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
      headset.model = MODEL
      headset.ringingDeviceUsagePage = '11'
      headset.deviceConnections[headset.ringingDeviceUsagePage] = deviceConnection
      afterEach(() => deviceConnection.write.mockClear())

      describe('inboundCall', () => {
        it('writes the appropriate command', () => {
          headset.inboundCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS[MODEL].INBOUND_CALL)
        })
      })

      describe('onCall', () => {
        it('writes the appropriate command', () => {
          headset.onCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS[MODEL].ON_CALL)
        })
      })

      describe('finishCall', () => {
        it('writes the appropriate command', () => {
          headset.finishCall()
          expect(deviceConnection.write).toHaveBeenCalledWith(WRITE_COMMANDS[MODEL].FINISH_CALL)
        })
      })
    })
  })
})
