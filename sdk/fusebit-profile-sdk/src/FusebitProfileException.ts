import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum FusebitProfileExceptionCode {
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

export class FusebitProfileException extends Exception {

  public static profileAlreadyExists(name: string) {
    const message = `The '${name}' profile already exists`;
    return new FusebitProfileException(FusebitProfileExceptionCode.profileAlreadyExists, message, [name]);
  }

  public static profileDoesNotExist(name: string) {
    const message = `The '${name}' profile does not exist`;
    return new FusebitProfileException(FusebitProfileExceptionCode.profileDoesNotExist, message, [name]);
  }

  public static readFileError(fileName: string, error: Error) {
    const message = `Unable to read the ${fileName} file due to the following error: '${error.message}'`;
    return new FusebitProfileException(FusebitProfileExceptionCode.readFileError, message, [fileName]);
  }

  public static writeFileError(fileName: string, error: Error) {
    const message = `Unable to write to the ${fileName} file due to the following error: '${error.message}'`;
    return new FusebitProfileException(FusebitProfileExceptionCode.writeFileError, message, [fileName]);
  }

  public static removeDirectoryError(directoryName: string, error: Error) {
    const message = `Unable to remove the ${directoryName} directory due to the following error: '${error.message}'`;
    return new FusebitProfileException(FusebitProfileExceptionCode.removeDirectoryError, message, [directoryName]);
  }

  public static noDefaultProfile() {
    const message = 'There is no default profile set';
    return new FusebitProfileException(FusebitProfileExceptionCode.noDefaultProfile, message);
  }

  public static baseUrlMissingProtocol(baseUrl: string) {
    const message = `The base url '${baseUrl}' does not include the protocol, 'http' or 'https'`;
    return new FusebitProfileException(FusebitProfileExceptionCode.baseUrlMissingProtocol, message, [baseUrl]);
  }
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }
}
