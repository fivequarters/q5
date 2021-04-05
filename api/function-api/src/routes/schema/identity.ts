import express from 'express';

import * as common from '../middleware/common';

import * as identity from '../handlers/identity';

import { tagged, search } from './tagged';
import instance from './instance';

const router = express.Router();
router.use(search);
router.route('/').options(common.cors()).post(common.management({}), identity.post);
router.use('/:identityId', instance);
router.use('/:identityId/tag', tagged);

export { router as default };
