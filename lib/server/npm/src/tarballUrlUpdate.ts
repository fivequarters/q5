import { IFunctionApiRequest } from './request';
import * as Constants from '@5qtrs/constants';

// Convert the urls in the tarball section to match the current account, even if they're nominally hosted in
// the global registry (or some other delegate, eventually).  This makes sure that any requests come back to
// the account where the credentials match, and eventually get converted into signed S3 URLs.
const tarballUrlUpdate = (req: IFunctionApiRequest, pkg: any) => {
  // Allow for override for tests.
  const baseUrl =
    req.tarballRootUrl ||
    `${Constants.API_PUBLIC_ENDPOINT}/v1/account/${req.params.accountId}/registry/${req.params.registryId}/npm`;

  // Update the dist tarball URL's to be within this account
  Object.keys(pkg.versions).forEach(version => {
    if (!pkg.versions[version]) {
      // Race condition handler
      return;
    }
    const tarball = pkg.versions[version].dist.tarball;
    const scope = tarball.scope;
    const name = tarball.name;
    pkg.versions[version].dist.tarball = `${baseUrl}/${scope}/${name}/-/${scope}/${name}@${tarball.version}`;
  });
};

export { tarballUrlUpdate };
