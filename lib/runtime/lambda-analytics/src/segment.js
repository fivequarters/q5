const Analytics = require('analytics-node');
const { v4 } = require('uuid');

const analytics = new Analytics(process.env.SEGMENT_KEY);

exports.post = function (logData) {
  return new Promise((res, rej) => {
    console.log('Promise being executed');
    for (const logEvent of logData.logEvents) {
      const { message } = logEvent;
      const parsedMessage = JSON.parse(message);
      const { fusebit, request } = parsedMessage;
      if (!fusebit || !request) {
        console.error('Invalid call on this message: ', parsedMessage);
        continue;
      }

      const event = {
        event: 'Called API',
        properties: {
          parsedMessage,
        },
      };
      if (request && request.headers && request.headers.authorization && request.headers.authorization.payload) {
        const { iss } = request.headers.authorization.payload;
        const userId = iss.split('.')[1];
        analytics.identify({ userId, traits: fusebit });
        analytics.track({
          userId,
          ...event,
        });
        console.log('tracked event for user: ', userId);
      } else {
        const anonymousId = v4();
        analytics.identify({ anonymousId, traits: fusebit });
        analytics.track({
          anonymousId,
          ...event,
        });
        console.log('tracked event for anonymous user: ', anonymousId);
      }
    }

    console.log('Flush initiated');
    analytics.flush((err) => {
      if (err) {
        console.log('Flush failed');
        console.log(err);
        return rej(err);
      }
      console.log('Flushed just fine');
      res();
    });
  });
};
