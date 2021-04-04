import express from 'express';

import * as common from '../middleware/common';
import * as tags from '../handlers/tagged';

const tagged = express.Router();

tagged.route('/').options(common.cors()).get(common.management({}), tags.getAllTags);

tagged
  .route('/:tagKey')
  .options(common.cors())
  .get(common.management({}), tags.getTag)
  .delete(common.management({}), tags.deleteTag);

tagged.route('/:tagKey/:tagValue').options(common.cors()).put(common.management({}), tags.setTag);

const search = express.Router();
search.route('/').options(common.cors()).get(common.management({}), tags.search);

export { tagged, search };
