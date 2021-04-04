import express from 'express';

import * as common from '../middleware/common';

import * as healthcheck from '../handlers/healthcheck';

const router = express.Router();

router.get('/', common.management({}), healthcheck.get);

export { router as default };
