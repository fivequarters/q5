const zlib = require('zlib');
const elasticSearch = require('./elastic-search.js');
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

      let logsData;
      try {
        logsData = parseLogsData(buffer);
      } catch (err) {
        return reject(err);
      }

      const { messageType, logEvents } = logsData;
      if (messageType !== 'DATA_MESSAGE' || !logEvents) {
        return null;
      }

      await offloadToSegment(logEvents);
      await offloadToElasticSearch(logsData);
      return resolve();
    });
  });
};

function parseLogsData(buffer) {
  try {
    logsData = JSON.parse(buffer.toString('utf8'));
  } catch (err) {
    console.error('Unable to parse buffer');
    throw err;
  }
}

async function offloadToSegment(logEvents) {
  try {
    await segment.post(logEvents);
  } catch (err) {
    console.error('Issue while offloading data to Segment. Error: ', err);
    console.error('Log Events: ', logEvents);
  }
}

async function offloadToElasticSearch(logsData) {
  try {
    await elasticSearch.post(logsData);
  } catch (err) {
    console.error('Issue while offloading data to ElasticSearch. Error: ', err);
    console.error('Log Events: ', logsData);
  }
}
