import assert from 'assert';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import * as Constants from '@5qtrs/constants';

// Missing this is an indication the environment isn't set up correctly - have the correct dotenv files been
// loaded?
assert(Constants.API_PUBLIC_ENDPOINT);

// This is required for the cron tests to successfully roundtrip.  It should be set to the fully qualified
// https://stack.deployment.domain.com url
assert(process.env.JWT_ALT_AUDIENCE);
