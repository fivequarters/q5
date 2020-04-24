import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { deleteFunction, putFunction, deleteAllFunctions } from './sdk';
import { IHttpResponse } from '@5qtrs/request';

const httpExpect = (response: IHttpResponse, { statusCode, data, headers, tests }: any): void => {
  try {
    if (statusCode) {
      if (typeof statusCode === 'object') {
        expect(status).toContain(response.status);
      } else {
        expect(response.status).toEqual(statusCode);
      }
    }

    if (data) {
      if (typeof data === 'object') {
        for (let [key, value] of Object.entries(data)) {
          expect(response.data[key]).toEqual(value);
        }
      } else {
        expect(response.data).toEqual(data);
      }
    }

    if (headers) {
      for (let [key, value] of Object.entries(headers)) {
        expect(response.headers[key]).toEqual(value);
      }
    }

    if (tests) {
      for (let test of tests) {
        test();
      }
    }
  } catch (err) {
    err.message = `${err.message}\n\nfailing response:\n${response.status} - ${JSON.stringify(
      response.headers
    )} - ${JSON.stringify(response.data)}`;
    throw err;
  }
};

const newBoundaryId = (): string => {
  return `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
};

const setupEnvironment = () => {
  let account: IAccount = FakeAccount;

  let boundaryId = newBoundaryId();
  const function1Id = 'test-function-1';
  const function2Id = 'test-function-2';

  beforeAll(async () => {
    account = await resolveAccount();
  });

  afterAll(async () => {
    await deleteAllFunctions(account, boundaryId);
  }, 200000);

  beforeEach(async () => {
    await deleteAllFunctions(account, boundaryId);
  }, 200000);

  const rotateBoundary = (): string => {
    boundaryId = newBoundaryId();
    return boundaryId;
  };

  const getBoundary = (): string => {
    return boundaryId;
  };

  const getAccount = (): IAccount => {
    return account;
  };

  const createFunction = async (functionId: string, payload: string) => {
    let response = await putFunction(account, boundaryId, functionId, {
      nodejs: {
        files: {
          'index.js': payload,
          'package.json': {
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    httpExpect(response, { status: 200, data: { status: 'success' } });
    return response;
  };

  return { getAccount, getBoundary, rotateBoundary, createFunction, function1Id, function2Id };
};

export { setupEnvironment, httpExpect };
