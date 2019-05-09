import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum AwsAmiExceptionCode {
  noSuchUbuntuServerAmi = 'noSuchUbuntuServerAmi',
}

// ----------------
// Exported Classes
// ----------------

export class AwsAmiException extends Exception {
  public static noSuchUbuntuServerAmi(version: string) {
    const message = `There is no Ubuntu Server with version '${version}'`;
    return new AwsAmiException(AwsAmiExceptionCode.noSuchUbuntuServerAmi, message, [version]);
  }

  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }
}
