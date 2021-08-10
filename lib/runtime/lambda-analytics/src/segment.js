const Analytics = require('analytics-node');

const analytics = new Analytics(process.env.SEGMENT_KEY);

exports.post = function (logData) {
  console.log('Starting to offload to Segment');
  console.log('SEGMENT_KEY = ' + process.env.SEGMENT_KEY);
  console.log('analytics = ', analytics);
  return new Promise((res, rej) => {
    console.log('Promise being executed');
    for (const logEvent of logData.logEvents) {
      console.log(logEvent);
      analytics.identify('someone ===========================');
      analytics.track({
        event: 'Called API',
        properties: {
          ...logEvent,
        },
      });
      console.log('Offloaded one event to Segment');
      console.log(logEvent);
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

// {
//   "timestamp": "2021-08-10T12:13:30.257Z",
//   "requestId": "dcc56389-0533-419c-bcfb-63ece9e08ca1",
//   "request": {
//     "headers": {
//       "accept": "application/json, text/plain, */*",
//       "authorization": {
//         "header": {
//           "alg": "RS256",
//           "typ": "JWT",
//           "kid": "267845e5",
//           "jwtId": "e0f96c12a3524b74ae579028d5e086c1"
//         },
//         "payload": {
//           "iat": 1628593536,
//           "exp": 1628600736,
//           "aud": "http://localhost:3001",
//           "iss": "d17acfdf.usr-5e87972cbef6466b.bruno.us-west-1.dev.fusebit.io",
//           "sub": "cli-c78c6887"
//         }
//       },
//       "content-type": "application/json",
//       "user-agent": "fusebit-cli/1.9.14",
//       "host": "localhost:3001",
//       "connection": "keep-alive"
//     },
//     "httpVersionMajor": 1,
//     "httpVersionMinor": 1,
//     "method": "GET",
//     "url": "/account/acc-d5fdec191e6d41ba/subscription/sub-5895681d136e4a05/function?count=100",
//     "hostname": "localhost",
//     "ip": "::ffff:127.0.0.1",
//     "ips": [],
//     "params": { "accountId": "acc-d5fdec191e6d41ba" },
//     "path": "/account/acc-d5fdec191e6d41ba/subscription/sub-5895681d136e4a05/function",
//     "protocol": "http",
//     "query": { "count": 100 },
//     "xhr": false
//   },
//   "response": {
//     "statusCode": 200,
//     "headers": {
//       "x-powered-by": "Express",
//       "access-control-allow-origin": "*",
//       "access-control-allow-credentials": "true",
//       "access-control-expose-headers": "x-fx-logs,x-fx-response-source,content-length",
//       "content-type": "application/json; charset=utf-8",
//       "content-length": "20477",
//       "etag": "W4ffd-EvmS81sv5lw3jKGeRU5xPRz7gq4"
//     }
//   },
//   "metrics": { "common": { "duration": 3115 } },
//   "fusebit": {
//     "subscriptionId": "sub-5895681d136e4a05",
//     "deploymentKey": "bruno",
//     "mode": "request",
//     "modality": "administration",
//     "stackVersion": "dev",
//     "stackId": "0",
//     "stackAMI": "0"
//   }
// }
