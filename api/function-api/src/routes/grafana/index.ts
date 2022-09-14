import express from 'express';

import proxy from './proxy';
import bootstrap from './bootstrap';
import initialize from './initialize';

import { isGrafanaEnabled } from '@5qtrs/constants';

const router = express.Router({ mergeParams: true });

const featureNotSupported = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return res.status(406).send('Feature not supported.');
};

isGrafanaEnabled() ? router.use(bootstrap, proxy) : router.use(featureNotSupported);

export { router as proxy, initialize };
