import express from 'express';

import * as analytics from '../middleware/analytics';
import * as common from '../middleware/common';

import { search } from './tagged';
import instance from './instance';

import * as component from '../handlers/component';

const router = express.Router();

// Specify that all requests in this component are Administration requests
// XXX not 100% accurate for /api endpoints or anything involving dispatch
router.use(analytics.setModality(analytics.Modes.Administration));

router.use('/', search);
router.route('/').options(common.cors()).post(common.management({}), component.post);

router.use('/:componentId', instance);

export { router as default };
