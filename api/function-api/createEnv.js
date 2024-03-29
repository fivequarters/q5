require('dotenv').config({ path: __dirname + '/.env.bootstrap' });

const Fs = require('fs');
const AWS = require('aws-sdk');

let env = Fs.readFileSync(__dirname + '/.env.template', 'utf8');
return addAwsCredentials();

function addAwsCredentials() {
  let creds;
  if (!process.env.MFA) {
    // if MFA is present, always refresh the credentials.
    try {
      creds = JSON.parse(Fs.readFileSync(__dirname + '/.env.aws', 'utf8'));
      console.log('Cached AWS credentials valid until', new Date(creds.Credentials.Expiration).toString());
      if (new Date() - new Date(creds.Credentials.Expiration) > 10 * 60000) {
        // Only used cashed session token if valid for more than 10 mins
        creds = undefined;
      }
    } catch (_) {}
  }

  if (!creds && !process.env.EC2) {
    if (!process.env.MFA) {
      console.error('ERROR:', 'The MFA environment variable must be specified to provide the MFA code');
      process.exit(1);
    }
    AWS.config.apiVersions = { sts: '2011-06-15' };
    let sts = new AWS.STS();
    return sts.assumeRole(
      {
        DurationSeconds: +(process.env.SESSION_DURATION_H || 12) * 3600,
        RoleArn: process.env.API_ROLE,
        SerialNumber: process.env.SERIAL_NUMBER,
        TokenCode: process.env.MFA,
        RoleSessionName: 'function-api-development',
      },
      (e, d) => {
        if (e) throw new Error('Unable to obtain AWS session token: ' + e.message);
        Fs.writeFileSync(__dirname + '/.env.aws', JSON.stringify(d, null, 2), { encoding: 'utf8' });
        addCreds(d);
        addSegmentKey(d);
        return addElasticsearchCredentials();
      }
    );
  } else {
    addCreds(creds);
    addSegmentKey(creds);
    return addElasticsearchCredentials();
  }
}

function addSegmentKey(creds) {
  if (!process.env.SEGMENT_KEY && creds && creds.segmentKey) {
    env = `${env}
SEGMENT_KEY=${creds.segmentKey}
`;
  }
}

function addCreds(creds) {
  if (!process.env.EC2) {
    env = `${env}
AWS_ACCESS_KEY_ID=${creds.Credentials.AccessKeyId}
AWS_SECRET_ACCESS_KEY=${creds.Credentials.SecretAccessKey}
AWS_SESSION_TOKEN=${creds.Credentials.SessionToken}
`;
  }
}

function addElasticsearchCredentials() {
  let creds;
  try {
    creds = JSON.parse(Fs.readFileSync(__dirname + '/.env.elasticsearch', 'utf8'));
    if (creds.hostname) {
      env = `${env}
ES_HOST=${creds.hostname}
ES_USER=${creds.username || ''}
ES_PASSWORD=${creds.password || ''}
ES_REDIRECT=${creds.redirect || ''}
ES_ANALYTICS_ROLE="arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/Fusebit-Admin,arn:aws:iam::${
        process.env.AWS_ACCOUNT_ID
      }:role/fusebit-analytics"
SERVICE_ROLE="arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/fusebit-EC2-instance"
`;
    }
  } catch (_) {}
  return addLogsUrl();
}

function addLogsUrl() {
  require('superagent')
    .get('http://127.0.0.1:4040/api/tunnels')
    .end((e, r) => {
      if (e) {
        console.error(
          'Real-time logs are disabled. Run `yarn ngrok` or `yarn tunnel` to enable tunneling of real time logs.'
        );
        return saveEnv();
      }
      if (r.body && r.body.tunnels) {
        for (var i = 0; i < r.body.tunnels.length; i++) {
          if (r.body.tunnels[i].proto === 'http') {
            env = `${env}\nLOGS_HOST=${r.body.tunnels[i].public_url.replace(/http[s]?:\/\//, '')}`;
            return saveEnv();
          }
        }
      }
      console.error('Real-time logs are disabled. Unable to determine tunnel url from ngrok configuration:', r.text);
      return saveEnv();
    });
}

function saveEnv() {
  console.log('Saving environment to .env:');
  Fs.writeFileSync(__dirname + '/.env', env, { encoding: 'utf8' });

  // Excise out secrets for safe pretty-print
  let splitEnv = env.split('\n');
  [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'ES_USER',
    'ES_HOST',
    'ES_PASSWORD',
    'SEGMENT_KEY',
  ].forEach((k) => {
    const re = new RegExp(`^${k}=\(.*\)$`);
    splitEnv = splitEnv.map((ln) => ln.replace(re, (_, p1) => `${k}=*x${p1.length}`));
  });

  console.log(splitEnv.join('\n'));
}
