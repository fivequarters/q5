import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum FusebitOpsProfileExceptionCode {
  noDefaultProfile = 'noDefaultProfile',
  profileDoesNotExist = 'profileDoesNotExist',
  profileAlreadyExists = 'profileAlreadyExists',
  readFileError = 'readFileError',
  writeFileError = 'writeFileError',
  removeDirectoryError = 'removeDirectoryError',
  baseUrlMissingProtocol = 'baseUrlMissingProtocol',
}

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsProfileException extends Exception {
  public static profileAlreadyExists(name: string) {
    const message = `The '${name}' profile already exists`;
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.profileAlreadyExists, message, [name]);
  }

  public static profileDoesNotExist(name: string) {
    const message = `The '${name}' profile does not exist`;
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.profileDoesNotExist, message, [name]);
  }

  public static readFileError(fileName: string, error: Error) {
    const message = `Unable to read the ${fileName} file due to the following error: '${error.message}'`;
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.readFileError, message, [fileName]);
  }

  public static writeFileError(fileName: string, error: Error) {
    const message = `Unable to write to the ${fileName} file due to the following error: '${error.message}'`;
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.writeFileError, message, [fileName]);
  }

  public static removeDirectoryError(directoryName: string, error: Error) {
    const message = `Unable to remove the ${directoryName} directory due to the following error: '${error.message}'`;
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.removeDirectoryError, message, [
      directoryName,
    ]);
  }

  public static noDefaultProfile() {
    const message = 'There is no default profile set';
    return new FusebitOpsProfileException(FusebitOpsProfileExceptionCode.noDefaultProfile, message);
  }
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }
}
