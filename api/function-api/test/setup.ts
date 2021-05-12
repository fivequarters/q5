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

function toBeHttp(response: IHttpResponse, { statusCode, data, headers, has, hasNot, tests }: any) {
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
          expect(response.data[key]).toEqual(value);
        }
      } else {
        expect(response.data).toEqual(data);
      }
    }

    if (has) {
      expect(response.data).toBeDefined();
      has.forEach((h: string) => {
        expect(response.data[h]).toBeDefined();
      });
    }

    if (hasNot) {
      expect(response.data).toBeDefined();
      hasNot.forEach((h: string) => {
        expect(response.data[h]).toBeUndefined();
      });
    }

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        expect(response.headers[key]).toEqual(value);
      }
    }

    if (tests) {
      for (const test of tests) {
        test();
      }
    }
  } catch (err) {
    const { account } = getEnv();
    const msg = `${err.message}\n\nfailing request:\n${response.status} ${response.request.method.toUpperCase()} ${
      response.request.url
    } - headers: ${JSON.stringify(response.headers, null, 2)} - data: ${JSON.stringify(
      response.data,
      null,
      2
    )} - account: ${JSON.stringify(account)}`;
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
    'fails to match the required pattern: /^acc-[a-g0-9]{16}$/',
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
  return toBeHttpError(
    received,
    409,
    `The storage for could not be updated because the provided etag value does not match the current etag value`
  );
}

function toBeStorageNotFound(received: any, storageId: string, storagePath?: string) {
  if (storagePath) {
    storagePath = storagePath[0] === '/' ? storagePath : `/${storagePath}`;
  }
  const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
  return toBeHttpError(received, 404, `The storage for '${storageId}' ${storagePathMessage}does not exist`);
}

const matchers = {
  toBeHttp,
  toBeHttpError,
  toBeMalformedAccountError,
  toBeUnauthorizedError,
  toBeNotFoundError,
  toBeUnauthorizedToGrantError,
  toBeStorageConflict,
  toBeStorageNotFound,
};

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toBeHttp: ({ statusCode, data, headers, tests }: any) => R;
      toBeHttpError: (status: number, message: string) => R;
      toBeMalformedAccountError: (malformedAccountId: string) => R;
      toBeUnauthorizedError: () => R;
      toBeNotFoundError: () => R;
      toBeUnauthorizedToGrantError: (userId: string, action: string, resource: string) => R;
      toBeStorageConflict: (storageId: string, etag: string, isUpdate?: boolean, storagePath?: string) => R;
      toBeStorageNotFound: (storageId: string, storagePath?: string) => R;
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
