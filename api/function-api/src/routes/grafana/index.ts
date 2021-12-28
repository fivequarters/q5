import express from 'express';

import proxy from './proxy';
import bootstrap from './bootstrap';
import initialize from './initialize';

const router = express.Router({ mergeParams: true });

router.use(bootstrap, proxy);

export { router as proxy, initialize };
