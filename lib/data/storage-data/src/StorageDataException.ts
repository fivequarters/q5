import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum StorageDataExceptionCode {
  noStorage = 'noStorage',
  configNotProvided = 'configNotProvided',
  storageConflict = 'storageConflict',
  jsonParseError = 'jsonParseError',
  missingData = 'missingData',
}

// ----------------
// Exported Classes
// ----------------

export class StorageDataException extends Exception {
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }

  public static noStorage(storageId: string, storagePath: string = '') {
    const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
    const message = `The storage for '${storageId}' ${storagePathMessage}does not exist`;
    return new StorageDataException(StorageDataExceptionCode.noStorage, message, [storageId, storagePath]);
  }

  public static configNotProvided(configName: string) {
    const message = `A value for the the config setting '${configName}' was not provided`;
    return new StorageDataException(StorageDataExceptionCode.configNotProvided, message, [configName]);
  }

  public static storageConflict(storageId: string, isUpdate: boolean, etag: string, storagePath: string = '') {
    const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
    const message = [
      `The storage for '${storageId}' ${storagePathMessage}could not be ${isUpdate ? 'updated' : 'deleted'}`,
      `because the provided etag value of '${etag}' dose not match the current etag value`,
    ].join(' ');
    return new StorageDataException(StorageDataExceptionCode.storageConflict, message, [
      storageId,
      isUpdate,
      etag,
      storagePath,
    ]);
  }

  public static jsonParseError(storageId: string, error: Error, storagePath: string = '') {
    const storagePathMessage = storagePath ? `with a storage path of '${storagePath}' ` : '';
    const message = `The data for '${storageId}' ${storagePathMessage}resulted in a JSON parse error: ${error.message}`;
    return new StorageDataException(
      StorageDataExceptionCode.jsonParseError,
      message,
      [storageId, error, storagePath],
      error
    );
  }

  public static missingData(storageId: string) {
    const message = `No data was provided for '${storageId}'`;
    return new StorageDataException(StorageDataExceptionCode.missingData, message, [storageId]);
  }
}
