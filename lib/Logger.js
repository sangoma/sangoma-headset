// Create temp file logger
const simpleLogger = require('simple-node-logger').createSimpleFileLogger('sangoma-headset.log');

// Define logger for debug
class Logger {
  log (p1, p2, p3, p4) {
    // simpleLogger.log(arguments);
    simpleLogger.info(p1, ' ', p2, ' ', p3, ' ', p4);
    if (!process.env.DEBUG) {
      return
    }
    console.log(arguments);			
  }
	
  error (p1, p2, p3, p4) {
    // simpleLogger.error(arguments);
    simpleLogger.info(p1, ' ', p2, ' ', p3, ' ', p4);
    if (!process.env.DEBUG) {
      return
    }
    console.error(arguments);
  }
}
	
module.exports = new Logger()