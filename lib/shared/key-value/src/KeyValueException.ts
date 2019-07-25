import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum KeyValueExceptionCode {
  valuesNotAnObject = 'valuesNotAnObject',
  valueNotAString = 'keyValuesNotAString',
  serializedAndValuesUpdated = 'serializedAndValuesUpdated',
}

// ----------------
// Exported Classes
// ----------------

export class KeyValueException extends Exception {
  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }

  public static valuesNotAnObject() {
    const message = `The instance is not an object of key value pairs`;
    return new KeyValueException(KeyValueExceptionCode.valuesNotAnObject, message, []);
  }

  public static valueNotAString(key: string) {
    const message = `The key '${key}' has am invalid non-string value`;
    return new KeyValueException(KeyValueExceptionCode.valueNotAString, message, [key]);
  }

  public static serializedAndValuesUpdated(keys: string[]) {
    const message = `Both the values and serialized values of with keys '${keys.join(' ')}' were updated`;
    return new KeyValueException(KeyValueExceptionCode.serializedAndValuesUpdated, message, [keys]);
  }
}
