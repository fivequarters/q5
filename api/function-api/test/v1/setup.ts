import { IHttpResponse } from '@5qtrs/request';

import { getEnv, nextBoundary, initializeEnvironment, getAllBoundaries, resetEnvironment } from './environment';

import {
  IFunctionCatalog,
  IFunctionCatalogEntry,
  functionCatalog,
  enableFunctionUsageRestriction,
  deleteAllFunctions,
} from './sdk';

// ------------------
// Internal Functions
// ------------------

function toBeHttp(response: IHttpResponse, { statusCode, data, headers, has, hasNot, tests }: IToBeHttp) {
  let keyValueMsg;
  try {
    if (statusCode) {
      if (typeof statusCode === 'object') {
        expect(statusCode).toContain(response.status);
      } else {
        expect(response.status).toEqual(statusCode);
      }
    }

    if (data) {
      if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          keyValueMsg = `on data '${key}', expecting ${JSON.stringify(value)}`;
          if (typeof value === 'object' && value !== null) {
            expect(response.data[key]).toMatchObject(value);
          } else {
            expect(response.data[key]).toEqual(value);
          }
        }
      } else {
        expect(response.data).toEqual(data);
      }
    }
    keyValueMsg = '';

    if (has) {
      expect(response.data).toBeDefined();
      has.forEach((h: string) => {
        keyValueMsg = `expecting data.${h}`;
        expect(response.data[h]).toBeDefined();
      });
    }
    keyValueMsg = '';

    if (hasNot) {
      expect(response.data).toBeDefined();
      hasNot.forEach((h: string) => {
        keyValueMsg = `not expecting data.${h}`;
        expect(response.data[h]).toBeUndefined();
      });
    }
    keyValueMsg = '';

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        keyValueMsg = `on header['${key}'], expecting ${JSON.stringify(value)}`;
        expect(response.headers[key]).toEqual(value);
      }
    }
    keyValueMsg = '';

    if (tests) {
      for (const test of tests) {
        test();
      }
    }
  } catch (err) {
    const { account } = getEnv();
    const msg = `${err.message} ${keyValueMsg}\n\nfailing request:\n${
      response.status
    } ${response.request?.method.toUpperCase()} ${response.request?.url} - headers: ${JSON.stringify(
      response.headers,
      null,
      2
    )} - data: ${JSON.stringify(response.data, null, 2)} - account: ${JSON.stringify(account)}`;
    return { message: () => msg, pass: false };
  }
  return { message: () => '', pass: true };
}

function toBeHttpError(received: any, status: number, message?: string) {
  let pass = false;

  const asResult = (msg: string) => {
    const err = `${msg}\n\nfailing response:\n${received.status} - ${JSON.stringify(
      received.headers,
      null,
      2
    )} - ${JSON.stringify(received.data, null, 2)}`;
    return { message: () => err, pass };
  };

  if (!received) {
    return asResult(`expected HTTP response to be defined`);
  }

  if (!received.status) {
    return asResult(`expected HTTP response to have a status`);
  }

  if (received.status !== status) {
    return asResult(`expected HTTP response status '${received.status}' to be '${status}'`);
  }

  if (!received.data) {
    return asResult(`expected HTTP response to have data'`);
  }

  if (!received.data.status) {
    return asResult(`expected HTTP response data to have a 'status' property`);
  }

  if (received.data.status !== status) {
    return asResult(`expected HTTP response data status '${received.data.status}' to be '${status}'`);
  }

  if (!received.data.statusCode) {
    return asResult(`expected HTTP response data to have a 'statusCode' property`);
  }

  if (received.data.statusCode !== status) {
    return asResult(`expected HTTP response data status code '${received.data.statusCode}' to be '${status}'`);
  }

  if (!received.data.message) {
    return asResult(`expected HTTP response data to have a 'message' property`);
  }

  if (received.data.message.indexOf(message) === -1) {
    return asResult(`expected HTTP response data message '${received.data.message}' to be '${message}'`);
  }

  pass = true;

  return asResult('');
}

function toBeMalformedAccountError(received: any, malformedAccountId: string) {
  const message = [
    `accountId: "accountId" with value "${malformedAccountId}"`,
    'fails to match the required pattern: /^acc-[a-f0-9]{16}$/',
  ].join(' ');
  return toBeHttpError(received, 400, message);
}

function toBeUnauthorizedError(received: any) {
  return toBeHttpError(received, 403, 'Unauthorized');
}

function toBeUnauthorizedToGrantError(received: any, userId: string, action: string, resource: string) {
  return toBeHttpError(
    received,
    400,
    `The user '${userId}' is not authorized to grant access to perform the action '${action}' on resource '${resource}'`
  );
}

function toBeNotFoundError(received: any) {
  return toBeHttpError(received, 404, 'Not Found');
}

function toBeStorageConflict(
  received: any,
  storageId: string,
  etag: string,
  isUpdate: boolean = true,
  storagePath: string = ''
) {
  if (storagePath) {
    storagePath = storagePath[0] === '/' ? storagePath : `/${storagePath}`;
  }
  const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
  return toBeHttpError(
    received,
    409,
    `The storage for '${storageId}' ${storagePathMessage}could not be ${
      isUpdate ? 'updated' : 'deleted'
    } because the provided etag value of '${etag}' dose not match the current etag value`
  );
}

function toBeStorageNotFound(received: any, storageId: string, storagePath?: string) {
  if (storagePath) {
    storagePath = storagePath[0] === '/' ? storagePath : `/${storagePath}`;
  }
  const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
  return toBeHttpError(received, 404, `The storage for '${storageId}' ${storagePathMessage}does not exist`);
}

function toBeUUID(received: string) {
  const pass: boolean = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(received);

  return { message: () => `Not a valid UUID: ${received}`, pass };
}

function toBeSessionId(received: string) {
  const pass: boolean = /^sid-[0-9a-f]{32}$/.test(received);
  return { message: () => `Not a valid session id: ${received}`, pass };
}

function toBeInstallId(received: string) {
  const pass: boolean = /^ins-[0-9a-f]{32}$/.test(received);
  return { message: () => `Not a valid install id: ${received}`, pass };
}

function toBeIdentityId(received: string) {
  const pass: boolean = /^idn-[0-9a-f]{32}$/.test(received);
  return { message: () => `Not a valid identity id: ${received}`, pass };
}

/*
 * toExtend usage: expect(received).toExtend(expected);
 *
 * `toExtend` is similar to `toMatchObject` with a few improvements.
 *
 * Similar to `toMatchObject`, `toExtend` recursively checks objects and verifies both their shape and values.
 * `received` is expected to have the same shape/values as `expected`, but is allowed to have additional attributes
 * not found on `expected`.
 *
 * There are 2 main improvements that `toExtend` provides beyond the capabilities of `toMatchObject`:
 *  1. `toMatchObject` will demand that 2 arrays have identical sizes.  `received` is only permitted to have attributes
 *      added to objects it contains.  `toExtend`, however, will pass it's test as long as every array provided by
 *      `received` contains *at least* the same entries as the array provided by expected`.
 *  2. `toExtend` also attempts to match stringified json values, by parsing them before comparing.  This is valuable
 *      to allow for the same recursive patterns applied to the rest of the object, and also to account for the
 *      potential for 2 stringified objects to be functionally identical, but with differing whitespace or order of
 *      attributes.
 */
const toExtend = <T extends string | object, R extends string | object>(
  received: T,
  expected: R
): jest.CustomMatcherResult => {
  return { pass: deepComparison(received, expected), message: () => 'Deep Comparison Failure' };
};

const deepComparison = <T extends string | object, R extends string | object>(a: T, b: R): boolean => {
  if (b === undefined) {
    return true;
  }
  if (b === {} && typeof a === 'object' && !Array.isArray(a)) {
    return true;
  }
  if (Array.isArray(b) && b.length === 0 && Array.isArray(a)) {
    return true;
  }
  if (typeof a === typeof b && a.toString() === b.toString()) {
    return true;
  }

  if (typeof a === 'object' && typeof b === 'string') {
    const bString: string = b;
    expect(() => JSON.parse(bString)).not.toThrowError();
    b = JSON.parse(b);
  }

  if (typeof a === 'string' && typeof b === 'object') {
    const aString: string = a;
    expect(() => JSON.parse(aString)).not.toThrowError();
    a = JSON.parse(a);
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLength = a.length > b.length ? a.length : b.length;
    const aArray: any[] = a;
    const bArray: any[] = b;
    return Array(maxLength)
      .fill(undefined)
      .every((_, index) => deepComparison(aArray[index], bArray[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const allKeys = Object.keys({ ...(<object>a), ...(<object>b) });
    return allKeys.every((key) => deepComparison((<Record<string, any>>a)[key], (<Record<string, any>>b)[key]));
  }

  try {
    a = JSON.parse(<string>a);
  } catch (e) {}
  try {
    b = JSON.parse(<string>a);
  } catch (e) {}
  expect(a).toMatchObject(b);
  return false;
};

const matchers = {
  toBeHttp,
  toBeHttpError,
  toBeMalformedAccountError,
  toBeUnauthorizedError,
  toBeNotFoundError,
  toBeUnauthorizedToGrantError,
  toBeStorageConflict,
  toBeStorageNotFound,
  toBeUUID,
  toBeInstallId,
  toBeIdentityId,
  toBeSessionId,
  toExtend,
};

export interface IToBeHttp {
  statusCode?: number | number[];
  data?: any;
  headers?: Record<string, string>;
  tests?: (() => any)[];
  has?: string[];
  hasNot?: string[];
}

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toBeHttp: ({ statusCode, data, headers, tests }: IToBeHttp) => R;
      toBeHttpError: (status: number, message: string) => R;
      toBeMalformedAccountError: (malformedAccountId: string) => R;
      toBeUnauthorizedError: () => R;
      toBeNotFoundError: () => R;
      toBeUnauthorizedToGrantError: (userId: string, action: string, resource: string) => R;
      toBeStorageConflict: (storageId: string, etag: string, isUpdate?: boolean, storagePath?: string) => R;
      toBeStorageNotFound: (storageId: string, storagePath?: string) => R;
      toBeUUID: () => R;
      toBeInstallId: () => R;
      toBeIdentityId: () => R;
      toBeSessionId: () => R;
      toExtend: (expected: T) => R;
    }
  }
}

// Load in the enhancements to expect
const jestExpect = (global as any).expect;
if (jestExpect !== undefined) {
  jestExpect.extend(matchers);
}

// Defensive gates to prevent a function from accidentally being used multiple times in a way that will cause
// a race.  Using the function metadata is fine; doing a PUT + PUT + execute with code changes may result in
// either of the two functions being executed, depending on whether or not AWS had converged by the time the
// execute was processed.

class DuplicateFunctionUsage extends Error {
  constructor(errors: IFunctionCatalog) {
    const m =
      Object.entries(errors)
        .map(
          (error: [string, IFunctionCatalogEntry]) =>
            `\nFunction ${error[0]} is used ${error[1].cnt} times in the following tests:\n` +
            Object.keys(error[1].testIds)
              .map((test: string) => `+ ${test}`)
              .join('\n')
        )
        .join('\n') + '\n';
    super(m);
  }
}

afterEach(() => {
  // Automatically enable function reuse restrictions for each test.
  enableFunctionUsageRestriction();
});

afterAll(() => {
  // Report tests that use the same function name multiple times as an error; this tends to cause instability
  // in the system unless carefully managed, as lambda does not guarantee that a successful putFunction will
  // result in only that function getting executed subsequently.
  const errors = Object.keys(functionCatalog).filter((k) => functionCatalog[k].cnt > 1);

  if (errors.length > 0) {
    console.log(errors.length);
    const breakingEntries: IFunctionCatalog = {};
    errors.forEach((e) => (breakingEntries[e] = functionCatalog[e]));
    throw new DuplicateFunctionUsage(breakingEntries);
  }
});

// Some general finalization processes to clean up after the test is done.
afterAll(async () => {
  resetEnvironment();
  const { account } = getEnv();
  await Promise.all(getAllBoundaries().map(async (boundaryId) => deleteAllFunctions(account, boundaryId)));
}, 200000);

export { getEnv, nextBoundary };
