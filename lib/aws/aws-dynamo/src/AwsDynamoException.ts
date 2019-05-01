import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum AwsDynamoExceptionCode {
  invalidNext = 'invalidNext',
  invalidLimit = 'invalidLimit',
  invalidTtl = 'invalidTtl',
  archiveNotEnabled = 'archiveNotEnabled',
  conditionCheckFailed = 'conditionCheckFailed',
  databaseError = 'databaseError',
}

// ----------------
// Exported Classes
// ----------------

export class AwsDynamoException extends Exception {

  public static invalidNext(next: string) {
    const message = `The next token '${next}' is invalid`;
    return new AwsDynamoException(AwsDynamoExceptionCode.invalidNext, message, [next]);
  }

  public static invalidLimit(limit: string) {
    const message = `The limit value '${limit}' is invalid; must be a positive number`;
    return new AwsDynamoException(AwsDynamoExceptionCode.invalidLimit, message, [limit]);
  }

  public static invalidTtl(ttl: string) {
    const message = `The ttl value '${ttl}' is invalid`;
    return new AwsDynamoException(AwsDynamoExceptionCode.invalidTtl, message, [ttl]);
  }

  public static archiveNotEnabled(table: string) {
    const message = `The table'${table}' does not have archiving enabled`;
    return new AwsDynamoException(AwsDynamoExceptionCode.archiveNotEnabled, message, [table]);
  }

  public static conditionCheckFailed(table: string, action: string, error: Error) {
    const message = [
      `Unable to perform action '${action}' on table '${table}' because the following condition check failed: `,
      error.message,
    ].join('');
    return new AwsDynamoException(AwsDynamoExceptionCode.conditionCheckFailed, message, [table, action], error);
  }

  public static databaseError(table: string, action: string, error: Error) {
    const message = `Unable to perform action '${action}' on table '${table}' due to the following error: '${
      error.message
    }'`;
    return new AwsDynamoException(AwsDynamoExceptionCode.databaseError, message, [table, action], error);
  }
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }
}
