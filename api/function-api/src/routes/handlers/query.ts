import { Request } from 'express';
import assert from 'assert';

const tag = (req: Request) => {
  const results: { tags?: { [key: string]: string } } = {};

  if (!req.query.tag) {
    return results;
  }

  let tagArray: string[];
  if (Array.isArray(req.query.tag)) {
    assertsStringArray(req.query.tag);
    tagArray = req.query.tag;
  } else {
    assert(typeof req.query.tag === 'string');
    tagArray = [req.query.tag];
  }

  results.tags = tagArray.reduce<Record<string, string>>((acc, cur) => {
    const [tagKey, tagValue] = cur.split('=');
    acc[tagKey] = tagValue;
    return acc;
  }, {});
  return results;
};

const assertsStringArray: (array: any[]) => asserts array is string[] = (array) => {
  array.forEach((item: any) => assert(typeof item === 'string'));
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

export default { tag, idPrefix, listPagination, version };
