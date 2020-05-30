const AWS = require('aws-sdk');

const credentialRefreshWindow = 10 * 60; // 10 minutes left
const defaultCredentialDuration = 12 * 60 * 60; // 12 hours

// Popualate the cache with the environment-supplied variables, if any.
let credentialCache = {
  account: process.env.AWS_ACCOUNT || '',
  region: process.env.AWS_REGION || '',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  sessionToken: process.env.AWS_SESSION_TOKEN || '',

  // If the credentials are provided via the environment (i.e. for testing), don't refresh.
  expiration: process.env.AWS_SESSION_TOKEN ? Date.now() + defaultCredentialDuration : 0,
};

// Query the metadata server on an EC2 instance to acquire new credentials
const refreshCredentials = async () => {
  console.log(`CRED: Refreshing (previous expiration ${new Date(credentialCache.expiration).toISOString()})`);

  await new Promise((resolve, reject) => {
    const credentials = new AWS.EC2MetadataCredentials({
      httpOptions: { timeout: 5000 }, // 5 second timeout
      maxRetries: 10, // retry 10 times
      retryDelayOptions: { base: 200 }, // see AWS.Config for information
    });

    credentials.refresh(err => {
      if (err) {
        console.log('CRED: Failure to acquire AWS credentials:', err);
        return process.exit(1);
      }

      let creds = credentials.metadata;
      credentialCache = {
        account: process.env.AWS_ACCOUNT,
        accessKeyId: creds.AccessKeyId,
        secretAccessKey: creds.SecretAccessKey,
        sessionToken: creds.Token,
        expiration: Date.parse(creds.Expiration),
      };
      console.log(`CRED: Refreshed (new expiration ${new Date(credentialCache.expiration).toISOString()})`);
      resolve();
    });
  });
};

// Return the current credentials with at least credentialRefreshWindow seconds of validity
const getAWSCredentials = async (wait = true) => {
  if (credentialCache.expiration < Date.now() + credentialRefreshWindow) {
    if (wait) {
      await refreshCredentials();
    } else {
      return undefined;
    }
  }

  return { ...credentialCache };
};

// Trigger a refresh if the credentials aren't supplied via the environment
getAWSCredentials();

export { getAWSCredentials };
