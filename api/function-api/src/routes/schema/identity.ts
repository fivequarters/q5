import express from 'express';

import * as common from '../middleware/common';

import { tagged, search } from './tagged';
import instance from './instance';

import * as identity from '../handlers/identity';

const router = express.Router();
router.use(search);
router.route('/').options(common.cors()).post(common.management({}), identity.post);
router.use('/:identityId', instance);
router.use('/:identityId/tag', tagged);

export { router as default };
