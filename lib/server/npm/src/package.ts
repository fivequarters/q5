import crypto from 'crypto';
import ssri from 'ssri';
import { v4 as uuid } from 'uuid';

import { Response, Request } from 'express';
import { IFunctionApiRequest } from './request';

import create_error from 'http-errors';

import { tarballUrlUpdate } from './tarballUrlUpdate';

const packagePut = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    // Get pkg
    let pkg = req.body;

    if (Object.keys(pkg._attachments).length !== 1 || Object.keys(pkg.versions).length !== 1) {
      return next(create_error(501, 'invalid parameter length'));
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
      return next(create_error(501, 'invalid parameter length'));
    }

    // Validate integrity and shasum are correct
    const shasum = crypto.createHash('sha1').update(payload).digest('hex');
    const integrity = ssri.fromData(payload, { algorithms: ['sha512'] }).toString();

    const dist = version.dist;
    if (shasum !== dist.shasum) {
      return next(create_error(501, 'invalid checksum'));
    }
    if (integrity !== dist.integrity) {
      return next(create_error(501, 'invalid integrity'));
    }

    try {
      // Get the existing manifest:
      const existing = await req.registry.get(pkg.name);
      if (existing) {
        // Copy over the necessary elements
        pkg.versions = { ...existing.versions, ...pkg.versions };
        pkg['dist-tags'] = { ...existing['dist-tags'], ...pkg['dist-tags'] };
      }

      pkg._rev = uuid();

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
    } catch (e) {
      return next(e);
    }
    res.status(200).json(pkg);
  };
};

const packageGet = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    const etag = req.headers['if-none-match'];
    const pkg = await req.registry.get(req.params.name);
    if (!pkg) {
      return next(create_error(404, 'package not found'));
    }

    if (pkg.etag === etag) {
      return res.status(304).json(pkg);
    }

    res.set('ETag', pkg.etag);

    tarballUrlUpdate(req, pkg);

    return res.status(200).json(pkg);
  };
};

export { packagePut, packageGet, tarballUrlUpdate };
