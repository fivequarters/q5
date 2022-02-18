import express from 'express';

import proxy from './proxy';
import bootstrap from './bootstrap';
import initialize from './initialize';
import * as Constants from './constants';

const router = express.Router({ mergeParams: true });

const featureNotSupported = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return res.status(406).send('Feature not supported.');
};

Constants.updateEndpoint();

// Grafana is protected behind a feature flag
process.env.GRAFANA_ENDPOINT ? router.use(bootstrap, proxy) : router.use(featureNotSupported);

export { router as proxy, initialize };
