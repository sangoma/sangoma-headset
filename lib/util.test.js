const { fillCommand, commandDescription } = require('./util')

describe('fillCommand returns expected array', () => {
  it('if maxsize is greater than original array size', () => {
    const arr = [0x01, 0x02, 0x03]
    const maxSize = 8
    const element = 0x00
    const expected = [0x01, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00]
    expect(fillCommand(arr, maxSize, element)).toEqual(expected);
  })
  it('if maxsize is smaller than original array size', () => {
    const arr = [0x01, 0x02, 0x03]
    const maxSize = 2
    const element = 0x00
    const expected = [0x01, 0x02, 0x03]
    expect(fillCommand(arr, maxSize, element)).toEqual(expected);
  })
})

it('commandDescription returns expected value', () => {
  const command = [88,16,0,11,0,1,1,0,155,2,1]
  const expectedString = "58 10 00 0b 00 01 01 00 9b 02 01"
  expect(commandDescription(command)).toEqual(expectedString)
})

