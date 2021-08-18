const Analytics = require('analytics-node');
const { v4 } = require('uuid');

const analytics = process.env.SEGMENT_KEY ? new Analytics(process.env.SEGMENT_KEY) : null;

exports.post = function (logEvents) {
  if (!analytics) {
    console.log('Skipping Segment offload. SEGMENT_KEY env var not configured.');
    return;
  }

  for (const logEvent of logEvents) {
    identifyAndTrackEvent(logEvent);
  }

  return new Promise((res, rej) => {
    analytics.flush((err) => {
      if (err) {
        return rej(err);
      }
      console.log('Segment flush (offloading) succeeded.');
      res();
    });
  });
};

function identifyAndTrackEvent(logEvent) {
  const { message } = logEvent;
  const parsedMessage = JSON.parse(message);
  const { fusebit, request } = parsedMessage;

  if (!fusebit || !request) {
    console.error('Invalid call on this message:', parsedMessage);
    return;
  }

  const event = {
    event: 'Called API',
    properties: {
      ...parsedMessage,
    },
  };

  const traits = fusebit;

  const payload = request.headers && request.headers.authorization ? request.headers.authorization.payload : null;

  if (payload) {
    identifyAndTrackEventForUser(payload, event, traits);
  } else {
    identifyAndTrackEventForAnonymous(event, traits);
  }
}

function identifyAndTrackEventForUser(payload, event, traits) {
  const fusebitProfile = payload['https://fusebit.io/profile'];
  const issuer = payload.issuer;

  const userId = fusebitProfile && fusebitProfile.userId ? fusebitProfile.userId : issuer.split('.')[1];

  analytics.identify({ userId, traits });
  analytics.track({
    userId,
    ...event,
  });
}

function identifyAndTrackEventForAnonymous(event, traits) {
  const { subscriptionId } = traits;
  analytics.identify({ userId: subscriptionId, traits });
  analytics.track({
    userId: subscriptionId,
    ...event,
  });
}
