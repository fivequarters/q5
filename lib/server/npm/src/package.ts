import crypto from 'crypto';
import ssri from 'ssri';

import { Response } from 'express';
import { IFunctionApiRequest } from './request';

class PackagePutException extends Error {}

const packagePut = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    console.log(`${req.method} ${req.url}`);
    // Get pkg
    const pkg = req.body;
    if (Object.keys(pkg._attachments).length !== 1 || Object.keys(pkg.versions).length !== 1) {
      return res.status(501).json({ status: 501, statusCode: 501, message: 'invalid parameter length' });
    }
    const attachment = pkg._attachments;
    delete pkg._attachments;
    const version = pkg.versions[Object.keys(pkg.versions)[0]];

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
    const existing = req.registry.get(pkg.name);
    if (existing) {
      // Copy over the necessary elements
      pkg.versions = { ...existing.versions, ...pkg.versions };
      pkg['dist-tags'] = { ...existing['dist-tags'], ...pkg['dist-tags'] };
    }

    // Update the etag
    pkg.etag = Math.random().toString().slice(2);
    pkg.date = new Date().toUTCString();

    // Save the attachment in the registry, and merge the previous document from dynamo
    req.registry.put(pkg.name, pkg, payload);

    res.status(201).json({});
  };
};

const packageGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    console.log(`${req.method} ${req.url}`);
    const etag = req.headers['if-none-match'];
    const pkg = req.registry.get(req.params.name);
    if (!pkg) {
      return res.status(404).json({ status: 404, statusCode: 404, message: 'package not found' });
    }

    res.set('ETag', pkg.etag);
    return res.status(200).json(pkg);
  };
};

export { packagePut, packageGet };
