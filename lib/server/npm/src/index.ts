import { distTagsDelete, distTagsGet, distTagsPut } from './distTags';
import { invalidatePost } from './invalidate';
import { auditPost, loginPut, pingGet, versionGet, whoamiGet } from './misc';
import { packageGet, packagePut } from './package';
import { allPackagesGet } from './packages';
import { revisionDelete, revisionPut } from './revision';
import { searchGet } from './search';
import { tarballDelete, tarballGet } from './tarball';

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
  revisionPut,
  revisionDelete,
  searchGet,
  tarballGet,
  tarballDelete,
  versionGet,
  whoamiGet,
};
