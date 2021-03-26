import express from 'express';

import * as common from '../middleware/common';
import * as tags from '../handlers/taggedEntity';

const router = express.Router();

router.route('/tag').options(common.cors()).get(common.management({}), tags.getAllTags);

router
  .route('/tag/:tagKey')
  .options(common.cors())
  .get(common.management({}), tags.getTag)
  .delete(common.management({}), tags.deleteTag);

router.route('/tag/:tagKey/:tagValue').options(common.cors()).put(common.management({}), tags.setTag);

export { router as default };
