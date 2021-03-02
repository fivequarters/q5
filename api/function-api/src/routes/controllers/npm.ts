import express from 'express';
import * as npm from '@5qtrs/npm';
// @ts-ignore
import validate_schema from '../middleware/validate_schema';
// @ts-ignore
import authorize from '../middleware/authorize';
// @ts-ignore
import npm_params from '../schemas/npm_params';

const npmApp = express.Router();

npmApp.options('/-/version');
npmApp.get(
  '/-/version',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.versionGet()
);

npmApp.options('/-/ping');
npmApp.get(
  '/-/ping',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.pingGet()
);

npmApp.options('/:scope/:name/-/:scope2/:filename');
npmApp.get(
  '/:scope/:name/-/:scope2/:filename',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.tarballGet()
);
npmApp.delete(
  '/:scope/:name/-/:scope2/:filename/-rev/:revisionId',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:delete' }),
  npm.tarballDelete()
);

npmApp.options('/:name');
npmApp.put(
  '/:name',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:put' }),
  express.json({ limit: process.env.PACKAGE_SIZE_LIMIT || '1000kb' }),
  npm.packagePut()
);
npmApp.delete(
  '/:name',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:delete' }),
  npm.packageDelete()
);
npmApp.get(
  '/:name',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.packageGet()
);

npmApp.options('/:name/-rev/:revisionId');
npmApp.put(
  '/:name/-rev/:revisionId',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:put' }),
  npm.revisionPut()
);
npmApp.delete(
  '/:name/-rev/:revisionId',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:delete' }),
  npm.revisionDelete()
);

npmApp.options('/-/invalidate/:name');
npmApp.post(
  '/-/invalidate/:name',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  npm.invalidatePost()
);

npmApp.options('/-/package/:name/dist-tags');
npmApp.post(
  '/-/package/:name/dist-tags',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  npm.distTagsGet()
);

npmApp.options('/-/package/:name/dist-tags/:tag');
npmApp.put(
  '/-/package/:name/dist-tags/:tag',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:put' }),
  express.json({ limit: process.env.PACKAGE_SIZE_LIMIT || '1000kb' }),
  npm.distTagsPut()
);

npmApp.options('/-/package/:name/dist-tags/:tag');
npmApp.delete(
  '/-/package/:name/dist-tags/:tag',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:put' }),
  npm.distTagsDelete()
);

npmApp.options('/-/api/v1/packages');
npmApp.get(
  '/-/api/v1/packages',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.allPackagesGet()
);

npmApp.options('/-/user/:user');
npmApp.put(
  '/-/user/:user',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  npm.loginPut() // Always will succeed
);

npmApp.options('/-/whoami');
npmApp.get(
  '/-/whoami',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.whoamiGet()
);

npmApp.options('/-/npm/v1/security/audits');
npmApp.post(
  '/-/npm/v1/security/audits',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  npm.auditPost()
);

npmApp.options('/-/v1/search');
npmApp.get(
  '/-/v1/search',
  validate_schema({ params: npm_params }),
  authorize({ operation: 'registry:get' }),
  npm.searchGet()
);



export default npmApp;