# Sangoma Headset Connector

Basic connector that manages connection to Sangoma Headsets and listens for events such as button presses, placing or removing from cradle, etc.

## Usage

```
const headset = require('sangoma-headset')
// Connect to the device
// Disconnection logic is handled within the headset object
headset.connect()
```

### Events
The `headset` object is an `EventEmitter` that can emit the following events:

* `placed-on-cradle`: Headset is placed on cradle
* `removed-from-cradle`: Headset is removed from cradle
* `hook`: Hook button is pressed. Only works when headset is on, this button will turn off the headset when no sound is being played
* `volume-up`
* `volume-down`
* `button-pressed`: Any button is pressed

## Installation

This project makes use of `node-hid` in order to connect and communicate with the device. All requirements from `node-hid` apply here, specially when using it within Electron.

## Electron projects using `node-hid`
In your electron project, add `electron-rebuild` to your `devDependencies`.
Then in your package.json `scripts` add:

```
  "postinstall": "electron-rebuild --force"
```
This will cause `npm` to rebuild `node-hid` for the version of Node that is in Electron.
If you get an error similar to `The module "HID.node" was compiled against a different version of Node.js`
then `electron-rebuild` hasn't been run and Electron is trying to use `node-hid`
compiled for Node.js and not for Electron.


If using `node-hid` with `webpack` or similar bundler, you may need to exclude
`node-hid` and other libraries with native code.  In webpack, you say which
`externals` you have in your `webpack-config.js`:
```
  externals: {
    "node-hid": 'commonjs node-hid'
  }
```

Examples of `node-hid` in Electron:
* [electron-hid-toy](https://github.com/todbot/electron-hid-toy) - a simple example of using `node-hid`, that will hopefully always track the latest Electron release
* [electron-hid-test](https://github.com/todbot/electron-hid-test) - even simpler example of using `node-hid`
* [Blink1Control2](https://github.com/todbot/Blink1Control2/) - a complete application, using webpack (e.g. see its [webpack-config.js](https://github.com/todbot/Blink1Control2/blob/master/webpack.config.js))