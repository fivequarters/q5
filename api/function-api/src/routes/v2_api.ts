import express from 'express';

import component from './schema/component';
import identity from './schema/identity';
import operation from './schema/operation';

import * as common from './middleware/common';

const router = express.Router();

const v2 = express.Router();
v2.use('/:componentType(connector|integration)', component);
v2.use('/:componentType(connector)/:componentId/identity', identity);
v2.use('/operation', operation);

v2.use(common.final());

router.use('/account/:accountId/subscription/:subscriptionId', v2);

module.exports = router;
