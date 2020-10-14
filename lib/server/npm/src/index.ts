import { distTagsDelete, distTagsGet, distTagsPut } from './distTags';
import { invalidatePost } from './invalidate';
import { auditPost, loginPut, pingGet, versionGet, whoamiGet } from './misc';
import { packageGet, packagePut } from './package';
import { allPackagesGet } from './packages';
import { revisionDelete } from './revision';
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
  revisionDelete,
  searchGet,
  tarballGet,
  versionGet,
  whoamiGet,
};
