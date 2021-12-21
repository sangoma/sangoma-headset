const commandDescription = (command) => {
  if (!command) return ''
  return command.map(num => num.toString(16).padStart(2, '0')).join(' ')
}

// Behavior is a bit different between mac and windows
const isMac = () => {
  const isMac = /^darwin/.test(process.platform)
  return isMac
}

// Useful for RTX commands, filled with some elements like 0x00 (up to 64 bytes)
const fillCommand = (arr, maxSize, element) => {
  if (!arr) return
  let filledArray = [];
  if (maxSize > arr.length) {
    filledArray = [...new Array(maxSize - arr.length)].map(() => element);
  }
  return arr.concat(filledArray)
}

module.exports.commandDescription = commandDescription
module.exports.isMac = isMac
module.exports.fillCommand = fillCommand