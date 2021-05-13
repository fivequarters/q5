// import express from 'express';
//
// import * as common from '../middleware/common';
//
// import * as tags from '../handlers/tagged';
//
// const tagged = express.Router();
//
// tagged.route('/').options(common.cors()).get(common.management({}), tags.getAll);
//
// tagged
//   .route('/:tagKey')
//   .options(common.cors())
//   .get(common.management({}), tags.get)
//   .delete(common.management({}), tags.remove);
//
// tagged.route('/:tagKey/:tagValue').options(common.cors()).put(common.management({}), tags.put);
//
// const search = express.Router();
// search.route('/').options(common.cors()).get(common.management({}), tags.search);
//
// export { tagged, search };
