import { IHttpResponse } from '@5qtrs/request';

// ------------------
// Internal Functions
// ------------------

function toBeHttpError(received: any, status: number, message: string) {
  let pass = false;
  let result = `expected HTTP response to be defined`;
  if (received) {
    if (!received.status) {
      result = `expected HTTP response to have a status`;
    } else if (received.status !== status) {
      result = `expected HTTP response status '${received.status}' to be '${status}'`;
    } else {
      if (!received.data) {
        result = `expected HTTP response to have data'`;
      } else {
        if (!received.data.status) {
          result = `expected HTTP response data to have a 'status' property`;
        } else if (received.data.status !== status) {
          result = `expected HTTP response data status '${received.data.status}' to be '${status}'`;
        } else {
          if (!received.data.statusCode) {
            result = `expected HTTP response data to have a 'statusCode' property`;
          } else if (received.data.statusCode !== status) {
            result = `expected HTTP response data status code '${received.data.statusCode}' to be '${status}'`;
          } else {
            if (!received.data.message) {
              result = `expected HTTP response data to have a 'message' property`;
            } else if (received.data.message !== message) {
              result = `expected HTTP response data message '${received.data.message}' to be '${message}'`;
            } else {
              pass = true;
            }
          }
        }
      }
    }
  }

  return {
    message: () => result,
    pass,
  };
}

function toBeMalformedAccountError(received: any, malformedAccountId: string) {
  const message = [
    `"accountId" with value "${malformedAccountId}"`,
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

// -------------------
// Exported Interfaces
// -------------------

export interface ExtendedMatchers extends jest.Matchers<IHttpResponse> {
  toBeHttpError: (status: number, message: string) => void;
  toBeMalformedAccountError: (malformedAccountId: string) => void;
  toBeUnauthorizedError: () => void;
  toBeNotFoundError: () => void;
  toBeUnauthorizedToGrantError: (userId: string, action: string, resource: string) => void;
}

// ------------------
// Exported Functions
// ------------------

export function extendExpect(expect: any): (value: any) => ExtendedMatchers {
  expect.extend({
    toBeHttpError,
    toBeMalformedAccountError,
    toBeUnauthorizedError,
    toBeNotFoundError,
    toBeUnauthorizedToGrantError,
  });

  return expect as (value: any) => ExtendedMatchers;
}
