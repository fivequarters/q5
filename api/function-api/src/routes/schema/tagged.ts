import express from 'express';

import * as common from '../middleware/common';
import * as tags from '../handlers/tagged';

const router = express.Router();

router.route('/').options(common.cors()).get(common.management({}), tags.getAllTags);

router
  .route('/:tagKey')
  .options(common.cors())
  .get(common.management({}), tags.getTag)
  .delete(common.management({}), tags.deleteTag);

router.route('/:tagKey/:tagValue').options(common.cors()).put(common.management({}), tags.setTag);

const search = express.Router();
search.route('/').options(common.cors()).get(common.management({}), tags.search);

export { router as default, search };
