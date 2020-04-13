const { exec } = require('pkg')
const fs = require('fs')
const path = require('path')

exec([ '-c', './pkg/config.json', '--target', 'host', '--output', 'dist/headset-cli', 'CommandTester.js' ])
  .then(() => {
    // Need to copy HID.node into dist folder
    console.log('Copying HID.node binary...')
    fs.copyFileSync(
      path.join('node_modules', 'node-hid', 'build', 'Release', 'HID.node'),
      path.join('dist', 'HID.node')
    )
    console.log('Success')
  })
  .catch(console.error)