import express from 'express';

import * as common from '../middleware/common';

import * as component from '../handlers/component';

import { search } from './tagged';
import instance from './instance';

const router = express.Router();

router.use('/', search);
router.route('/').options(common.cors()).post(common.management({}), component.post);

router.use('/:componentId', instance);

export { router as default };
