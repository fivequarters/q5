const Analytics = require('analytics-node');
const { v4 } = require('uuid');

const analytics = new Analytics(process.env.SEGMENT_KEY);

exports.post = function (logEvents) {
  for (const logEvent of logEvents) {
    identifyAndTrackEvent(logEvent);
  }

  return new Promise((res, rej) => {
    analytics.flush((err) => {
      if (err) {
        console.log('Segment flush (offloading) failed:', err);
        return rej(err);
      }
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
  console.log('tracked event for user: ', userId);
}

function identifyAndTrackEventForAnonymous(event, traits) {
  const anonymousId = v4();
  analytics.identify({ anonymousId, traits });
  analytics.track({
    anonymousId,
    ...event,
  });
  console.log('tracked event for anonymous user: ', anonymousId);
}
