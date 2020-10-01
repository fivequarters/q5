import { distTagsDelete, distTagsGet, distTagsPut } from './distTags';
import { invalidatePost } from './invalidate';
import { auditPost, loginPut, pingGet, versionGet, whoamiGet } from './misc';
import { packageGet, packagePut } from './package';
import { allPackagesGet } from './packages';
import { searchGet } from './search';
import { tarballGet } from './tarball';

export {
  allPackagesGet,
  auditPost,
  distTagsDelete,
  distTagsGet,
  distTagsPut,
  invalidatePost,
  loginPut,
  packageGet,
  packagePut,
  pingGet,
  searchGet,
  tarballGet,
  versionGet,
  whoamiGet,
};
