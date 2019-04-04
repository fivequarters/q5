export enum FlexdProfileErrorCode {
  noDefaultProfile = 'noDefaultProfile',
  profileDoesNotExist = 'profileDoesNotExist',
  profileAlreadyExists = 'profileAlreadyExists',
  readFileError = 'readFileError',
  writeFileError = 'writeFileError',
  removeDirectoryError = 'removeDirectoryError',
  baseUrlMissingProtocol = 'baseUrlMissingProtocol',
}

export class FlexdProfileError extends Error {
  private entityProp: string;
  private codeProp: FlexdProfileErrorCode;

  private constructor(entity: string, code: FlexdProfileErrorCode, message?: string) {
    super(message);
    this.entityProp = entity;
    this.codeProp = code;
  }

  public static profileAlreadyExists(name: string) {
    const message = `The '${name}' profile already exists`;
    return new FlexdProfileError(name, FlexdProfileErrorCode.profileAlreadyExists, message);
  }

  public static profileDoesNotExist(name: string) {
    const message = `The '${name}' profile does not exist`;
    return new FlexdProfileError(name, FlexdProfileErrorCode.profileDoesNotExist, message);
  }

  public static readFileError(fileName: string, error: Error) {
    const message = `Unable to read the ${fileName} file due to the following error: '${error.message}'`;
    return new FlexdProfileError(fileName, FlexdProfileErrorCode.readFileError, message);
  }

  public static writeFileError(fileName: string, error: Error) {
    const message = `Unable to write to the ${fileName} file due to the following error: '${error.message}'`;
    return new FlexdProfileError(fileName, FlexdProfileErrorCode.writeFileError, message);
  }

  public static removeDirectoryError(directoryName: string, error: Error) {
    const message = `Unable to remove the ${directoryName} directory due to the following error: '${error.message}'`;
    return new FlexdProfileError(directoryName, FlexdProfileErrorCode.removeDirectoryError, message);
  }

  public static noDefaultProfile() {
    const message = 'There is no default profile set';
    return new FlexdProfileError('<default>', FlexdProfileErrorCode.noDefaultProfile, message);
  }

  public static baseUrlMissingProtocol(baseUrl: string) {
    const message = `The base url '${baseUrl}' does not include the protocol, 'http' or 'https'`;
    return new FlexdProfileError(baseUrl, FlexdProfileErrorCode.baseUrlMissingProtocol, message);
  }

  public get entity() {
    return this.entityProp;
  }

  public get code() {
    return this.codeProp;
  }
}
