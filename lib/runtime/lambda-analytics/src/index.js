const zlib = require('zlib');
const segment = require('./segment.js');

exports.handler = (input) => {
  // decode input from base64
  const zippedInput = new Buffer.from(input.awslogs.data, 'base64');

  // decompress the input
  return new Promise((resolve, reject) => {
    zlib.gunzip(zippedInput, async (error, buffer) => {
      if (error) {
        return reject(err);
      }

      // parse the input from JSON
      try {
        const { messageType, logEvents } = JSON.parse(buffer.toString('utf8'));
        if (messageType !== 'DATA_MESSAGE' || !logEvents) {
          return null;
        }
        await segment.post(logEvents);
        resolve();
      } catch (err) {
        return reject(err);
      }
    });
  });
};
