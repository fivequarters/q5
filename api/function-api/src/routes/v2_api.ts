import express from 'express';

import * as common from './middleware/common';
import * as analytics from './middleware/analytics';

import component from './schema/component';
import element from './schema/element';
import operation from './schema/operation';

const router = express.Router();

const v2 = express.Router();

// All requests except for dispatched requests to /api are administrative for now.
v2.use(analytics.setModality(analytics.Modes.Administration));

v2.use('/:componentType(connector|integration)', component);
v2.use('/:componentType(connector)/:componentId/:elementType(identity)', element);
v2.use('/:componentType(integration)/:componentId/:elementType(instance)', element);
v2.use('/operation', operation);

v2.use(common.final());

router.use('/account/:accountId/subscription/:subscriptionId', v2);

module.exports = router;
