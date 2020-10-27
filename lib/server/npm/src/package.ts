import crypto from 'crypto';
import ssri from 'ssri';
import { v4 as uuid } from 'uuid';

import { Response } from 'express';
import { IFunctionApiRequest } from './request';

class PackagePutException extends Error {}

const packagePut = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    // Get pkg
    let pkg = req.body;

    if (Object.keys(pkg._attachments).length !== 1 || Object.keys(pkg.versions).length !== 1) {
      return res.status(501).json({ status: 501, statusCode: 501, message: 'invalid parameter length' });
    }
    const attachment = pkg._attachments;
    delete pkg._attachments;

    const [scope, name] = pkg.name.split('/');
    const version = pkg.versions[Object.keys(pkg.versions)[0]];
    const versionId = version.version;

    // Extract the buffer
    const payload = Buffer.from(attachment[Object.keys(attachment)[0]].data, 'base64');
    const length = attachment[Object.keys(attachment)[0]].length;

    if (payload.length !== length) {
      return res.status(501).json({ status: 501, statusCode: 501, message: 'invalid payload length' });
    }

    // Validate integrity and shasum are correct
    const shasum = crypto.createHash('sha1').update(payload).digest('hex');
    const integrity = ssri.fromData(payload, { algorithms: ['sha512'] }).toString();

    const dist = version.dist;
    if (shasum !== dist.shasum) {
      return res.status(501).json({ status: 501, statusCode: 501, message: 'invalid checksum' });
    }
    if (integrity !== dist.integrity) {
      return res.status(501).json({ status: 501, statusCode: 501, message: 'invalid integrity' });
    }

    // Get the existing manifest:
    const existing = await req.registry.get(pkg.name);
    if (existing) {
      // Copy over the necessary elements
      pkg.versions = { ...existing.versions, ...pkg.versions };
      pkg['dist-tags'] = { ...existing['dist-tags'], ...pkg['dist-tags'] };
      pkg._rev = uuid();
    }

    // Update the etag
    pkg.etag = Math.random().toString().slice(2);
    pkg.date = new Date().toUTCString();

    // Update the package URLs to be just the useful parts.
    dist.tarball = { scope, name, version: versionId };

    // Save the attachment in the registry, and merge the previous document from dynamo
    await req.registry.put(pkg.name, pkg, versionId, payload);

    // Get the articulated version from the registry
    pkg = await req.registry.get(req.params.name);
    tarballUrlUpdate(req, pkg);

    res.status(200).json(pkg);
  };
};

const packageGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const etag = req.headers['if-none-match'];
    const pkg = await req.registry.get(req.params.name);
    if (!pkg) {
      return res.status(404).json({ status: 404, statusCode: 404, message: 'package not found' });
    }

    if (pkg.etag === etag) {
      return res.status(304);
    }

    res.set('ETag', pkg.etag);

    tarballUrlUpdate(req, pkg);

    return res.status(200).json(pkg);
  };
};

// Convert the urls in the tarball section to match the current account, even if they're nominally hosted in
// the global registry (or some other delegate, eventually).  This makes sure that any requests come back to
// the account where the credentials match, and eventually get converted into signed S3 URLs.
const tarballUrlUpdate = (req: IFunctionApiRequest, pkg: any) => {
  // Allow for override for tests.
  const baseUrl =
    req.tarballRootUrl ||
    `${process.env.API_SERVER}/v1/account/${req.params.accountId}/registry/${req.params.registryId}/npm`;

  // Update the dist tarball URL's to be within this account
  for (const version of Object.keys(pkg.versions)) {
    const tarball = pkg.versions[version].dist.tarball;
    const scope = tarball.scope;
    const name = tarball.name;
    pkg.versions[version].dist.tarball = `${baseUrl}/${scope}/${name}/-/${scope}/${name}@${tarball.version}`;
  }
};

export { packagePut, packageGet, tarballUrlUpdate };
