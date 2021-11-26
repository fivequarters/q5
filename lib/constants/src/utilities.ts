import * as path from 'path';
import http_error from 'http-errors';
import * as express from 'express';

import * as crypto from 'crypto';

import { EntityType } from '@fusebit/schema';

const FUSEBIT_AUTHORIZATION_COOKIE = 'fusebitAuthorization';

const DYNAMO_BACKOFF_TRIES_MAX = 5;
const DYNAMO_BACKOFF_DELAY = 300;

const expBackoff = async (c: number, delay: number = DYNAMO_BACKOFF_DELAY) => {
  const backoff = Math.pow(2, c - 1) * delay;
  await new Promise((resolve, reject) => setTimeout(resolve, backoff));
};

async function dynamoScanTable(dynamo: any, params: any, map: any = (e: any) => e): Promise<any[]> {
  const result: any[] = [];
  let next;
  let backoff = 0;

  do {
    try {
      // Wait some time, if a backoff is necessary
      await expBackoff(backoff);

      // Perform the scan
      params.ExclusiveStartKey = next;
      const data = await dynamo.scan(params).promise();

      // Map the items, based on the supplied mapper
      data.Items.forEach((t: any) => result.push(map(t)));
      next = data.LastEvaluatedKey;

      if (!next) {
        break;
      }
    } catch (e) {
      if (e.retryable) {
        backoff++;
        if (backoff > DYNAMO_BACKOFF_TRIES_MAX) {
          throw new Error('Exceeded backoff');
        }

        continue;
      }
      throw e;
    }
  } while (true);

  return result;
}

async function asyncPool<T>(poolLimit: number, array: T[], iteratorFn: (item: T, array: T[]) => any): Promise<any> {
  const ret = [];
  const executing: Promise<any>[] = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e: Promise<any> = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

function duplicate(dst: any, src: any) {
  Object.keys(src).forEach((k) => {
    dst[k] = typeof src[k] === 'object' ? duplicate(Array.isArray(src[k]) ? [] : {}, src[k]) : (dst[k] = src[k]);
  });

  return dst;
}

const safePath = (filename: string): string => {
  const parsed = path.parse(path.normalize(filename));

  if (parsed.dir.startsWith('..') || parsed.dir.startsWith('/')) {
    throw http_error(400, `Invalid filename path: ${filename}`);
  }
  return parsed.dir === '' ? `${parsed.base}` : `${parsed.dir}/${parsed.base}`;
};

const safePathMap = (files: { [key: string]: string }): { [key: string]: string } => {
  const cleanFiles: { [key: string]: string } = {};
  Object.entries(files).forEach((entry: any) => {
    cleanFiles[safePath(entry[0])] = entry[1];
  }, {});
  return cleanFiles;
};

const isUuid = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const idToSpec: Record<EntityType, { prefix: string; len: number }> = {
  integration: { prefix: 'int', len: 0 }, // Not used
  connector: { prefix: 'con', len: 0 }, // Not used
  storage: { prefix: 'str', len: 0 }, // Not used
  identity: { prefix: 'idn', len: 16 },
  install: { prefix: 'ins', len: 16 },
  session: { prefix: 'sid', len: 16 },
};

const createUniqueIdentifier = (entityType: EntityType) => {
  const id = idToSpec[entityType];
  if (!id?.len) {
    throw new Error(`Invalid entity type: ${entityType}`);
  }

  return `${id.prefix}-${crypto.randomBytes(id.len).toString('hex')}`;
};

const getAuthToken = (
  req: express.Request,
  options: { header: boolean; cookie: boolean } = { header: true, cookie: false }
): string | undefined => {
  if (options.header && req.headers.authorization) {
    const match = req.headers.authorization.match(/^\ *bearer\ +(.+)$/i);
    return match ? match[1] : undefined;
  }

  if (options.cookie && req.headers.cookie?.includes(FUSEBIT_AUTHORIZATION_COOKIE)) {
    const cookies = req.headers.cookie.split(';');
    const cookieKvs = cookies.map((cookie) => cookie.split('='));
    const authCookie = cookieKvs.filter(
      (cookieKv) => cookieKv.length === 2 && cookieKv[0] === FUSEBIT_AUTHORIZATION_COOKIE
    );

    if (authCookie.length !== 1) {
      return undefined;
    }

    return authCookie[0][1];
  }
  return undefined;
};

const mergeDeep = (lhs: any, source: any, isMergingArrays: boolean = false) => {
  const target = ((obj) => {
    let cloneObj;
    try {
      cloneObj = JSON.parse(JSON.stringify(obj));
    } catch (err) {
      throw new Error('Circular references not supported in mergeDeep');
    }
    return cloneObj;
  })(lhs);

  const isObject = (obj: any) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source;
  }

  Object.keys(source).forEach((key: any) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      if (isMergingArrays) {
        target[key] = targetValue.map((x, i) =>
          sourceValue.length <= i ? x : mergeDeep(x, sourceValue[i], isMergingArrays)
        );
        if (sourceValue.length > targetValue.length) {
          target[key] = target[key].concat(sourceValue.slice(targetValue.length));
        }
      } else {
        target[key] = targetValue.concat(sourceValue);
      }
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep({ ...targetValue }, sourceValue, isMergingArrays);
    } else {
      target[key] = sourceValue;
    }
  });

  return target;
};

export {
  FUSEBIT_AUTHORIZATION_COOKIE,
  dynamoScanTable,
  expBackoff,
  asyncPool,
  duplicate,
  safePath,
  safePathMap,
  isUuid,
  getAuthToken,
  mergeDeep,
  createUniqueIdentifier,
};
