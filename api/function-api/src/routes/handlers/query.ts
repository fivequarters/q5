import { Request } from 'express';

const tags = (req: Request) => {
  if (typeof req.query.tags === 'string' && req.query.tags.length) {
    const tags = req.query.tags.split(',');
    const tagObject = tags.reduce<Record<string, string>>((acc, cur) => {
      const [tagKey, tagValue] = cur.split('=');
      acc[tagKey] = tagValue;
      return acc;
    }, {});
    return {
      tags: tagObject,
    };
  }
  return { tags: {} };
};

const idPrefix = (req: Request): { idPrefix?: string } => {
  return { idPrefix: req.query.idPrefix as string | undefined };
};

const listPagination = (req: Request) => {
  return { listLimit: Number(req.query.count), next: req.query.next as string | undefined };
};

const version = (req: Request) => {
  if (req.query.version) {
    return { version: req.query.version as string };
  }
  return {};
};

export default { tags, idPrefix, listPagination, version };
