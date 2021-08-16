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

  const issuer =
    request &&
    request.headers &&
    request.headers.authorization &&
    request.headers.authorization.payload &&
    request.headers.authorization.payload.iss
      ? request.headers.authorization.payload.iss
      : null;

  if (issuer) {
    identifyAndTrackEventForUser(issuer, event, traits);
  } else {
    identifyAndTrackEventForAnonymous(event, traits);
  }
}

function identifyAndTrackEventForUser(issuer, event, traits) {
  const userId = issuer.split('.')[1];
  analytics.identify({ userId, traits });
  analytics.track({
    userId,
    ...event,
  });
}

function identifyAndTrackEventForAnonymous(event, traits) {
  const anonymousId = v4();
  analytics.identify({ anonymousId, traits });
  analytics.track({
    anonymousId,
    ...event,
  });
}
