import express from 'express';

import * as common from './middleware/common';
import * as analytics from './middleware/analytics';

import component from './schema/component_old';
import element from './schema/element';
import operation from './schema/operation';
import schema from './schema';

const router = express.Router();

const v2 = express.Router({ mergeParams: true });

v2.use(schema);

// v2.use('/:componentType(connector|integration)', components);
// v2.use('/:componentType(connector)/:componentId/:elementType(identity)', element);
// v2.use('/:componentType(integration)/:componentId/:elementType(instance)', element);
// v2.use('/operation', operation);

v2.use(common.final());

router.use('/account/:accountId/subscription/:subscriptionId', v2);

export default router;
