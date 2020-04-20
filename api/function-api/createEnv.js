require('dotenv').config({ path: __dirname + '/.env.bootstrap' });

const Fs = require('fs');
const AWS = require('aws-sdk');

let env = Fs.readFileSync(__dirname + '/.env.template', 'utf8');
return addAwsCredentials();

function addAwsCredentials() {
  let creds;
  try {
    creds = JSON.parse(Fs.readFileSync(__dirname + '/.env.aws', 'utf8'));
    console.log('Cached AWS credentials valid until', new Date(creds.Credentials.Expiration).toString());
    if (new Date() - new Date(creds.Credentials.Expiration) > 10 * 60000) {
      // Only used cashed session token if valid for more than 10 mins
      creds = undefined;
    }
  } catch (_) {}

  if (!creds) {
    if (!process.env.MFA) {
      console.error('ERROR:', 'The MFA environment variable must be specified to provide the MFA code');
      process.exit(1);
    }
    AWS.config.apiVersions = { sts: '2011-06-15' };
    let sts = new AWS.STS();
    return sts.assumeRole(
      {
        DurationSeconds: +(process.env.SESSION_DURATION_H || 1) * 3600,
        RoleArn: process.env.API_ROLE,
        SerialNumber: process.env.SERIAL_NUMBER,
        TokenCode: process.env.MFA,
        RoleSessionName: 'function-api-development',
      },
      (e, d) => {
        if (e) throw new Error('Unable to obtain AWS session token: ' + e.message);
        Fs.writeFileSync(__dirname + '/.env.aws', JSON.stringify(d, null, 2), { encoding: 'utf8' });
        addCreds(d);
        return addElasticsearchCredentials();
      }
    );
  } else {
    addCreds(creds);
    return addElasticsearchCredentials();
  }
}

function addCreds(creds) {
  env = `${env}
AWS_ACCESS_KEY_ID=${creds.Credentials.AccessKeyId}
AWS_SECRET_ACCESS_KEY=${creds.Credentials.SecretAccessKey}
AWS_SESSION_TOKEN=${creds.Credentials.SessionToken}
`;
}

function addElasticsearchCredentials() {
  let creds;
  try {
    creds = JSON.parse(Fs.readFileSync(__dirname + '/.env.elasticsearch', 'utf8'));
    env = `${env}
ES_HOST=${creds.hostname}
ES_USER=${creds.username}
ES_PASSWORD=${creds.password}
`;
  } catch (_) {}
  return addLogsUrl();
}

function addLogsUrl() {
  require('superagent')
    .get('http://127.0.0.1:4040/api/tunnels')
    .end((e, r) => {
      if (e) {
        console.error('Real-time logs are disabled. Run `yarn ngrok` to enable tunneling of real time logs.');
        return saveEnv();
      }
      if (r.body && r.body.tunnels) {
        for (var i = 0; i < r.body.tunnels.length; i++) {
          if (r.body.tunnels[i].proto === 'http') {
            env = `${env}\nLOGS_HOST=${r.body.tunnels[i].public_url.replace('http://', '')}`;
            return saveEnv();
          }
        }
      }
      console.error(
        'Real-time logs are disabled. Unable to determine ngrok tunnel url from ngrok configuration:',
        r.text
      );
      return saveEnv();
    });
}

function saveEnv() {
  console.log('Saving environment to .env:');
  console.log(env);
  Fs.writeFileSync(__dirname + '/.env', env, { encoding: 'utf8' });
}
