import { is, isArray, isBoolean, isNumber, isObject, isString } from '@5qtrs/type';

// --------------
// Internal Types
// --------------

type Validator = (value: any) => boolean;

// ----------------
// Exported Classes
// ----------------

export class Valid {
  public static create(func?: Valid | Validator) {
    return new Valid(Valid.toFunc(func));
  }

  public static and(...args: Array<Valid | Validator>) {
    const func = (value: any) => {
      for (const arg of args) {
        const argFunc = Valid.toFunc(arg);
        if (!argFunc(value)) {
          return false;
        }
      }
      return true;
    };

    return Valid.create(func);
  }

  public static or(...args: Array<Valid | Validator>) {
    const func = (value: any) => {
      for (const arg of args) {
        const argFunc = Valid.toFunc(arg);
        if (argFunc(value)) {
          return true;
        }
      }
      return false;
    };

    return Valid.create(func);
  }

  public static not(arg: Valid | Validator) {
    const argFunc = Valid.toFunc(arg);
    const func = (value: any) => !argFunc(value);
    return new Valid(func);
  }

  public static is() {
    return Valid.isValid;
  }

  public static isBoolean() {
    return Valid.isBooleanValid;
  }

  public static isString() {
    return Valid.isStringValid;
  }

  public static isNumber() {
    return Valid.isNumberValid;
  }

  public static isObject() {
    return Valid.isObjectValid;
  }

  public static isArray() {
    return Valid.isArrayValid;
  }

  public static isInteger() {
    return Valid.isIntegerValid;
  }

  public static hasProperty(name: string, validator?: Valid | Validator) {
    const argFunc = Valid.toFunc(validator);
    const func = (value: any) => isObject(value) && is(value[name]) && argFunc(value[name]);
    return new Valid(func);
  }

  public static isArrayOf(validator?: Valid | Validator) {
    const argFunc = Valid.toFunc(validator);
    const func = (value: any) => isArray(value) && (value as Array<any>).every(argFunc);
    return new Valid(func);
  }

  public static isOneOf(validValues: Array<any>) {
    const func = (value: any) => (validValues.find((item) => item === value) ? true : false);
    return new Valid(func);
  }

  public static match(regex: RegExp) {
    const func = (value: any) => isString(value) && regex.test(value as string);
    return new Valid(func);
  }

  public static isLowerCase() {
    return Valid.isLowerCaseValid;
  }

  public static isUpperCase() {
    return Valid.isUpperCaseValid;
  }

  private static isValid = new Valid(is);
  private static isBooleanValid = new Valid(isBoolean);
  private static isStringValid = new Valid(isString);
  private static isNumberValid = new Valid(isNumber);
  private static isObjectValid = new Valid(isObject);
  private static isArrayValid = new Valid(isArray);
  private static isIntegerValid = new Valid(Number.isInteger);
  private static isLowerCaseValid = new Valid((value: any) => isString(value) && value.toLowerCase() === value);
  private static isUpperCaseValid = new Valid((value: any) => isString(value) && value.toUpperCase() === value);

  private static toFunc(validator?: Valid | Validator): Validator {
    if (!validator) {
      return () => true;
    }
    return validator instanceof Valid ? validator.func : validator;
  }

  private constructor(func: Validator) {
    this.func = func;
  }

  public validate(value: any) {
    return this.func(value);
  }
  private func: Validator = () => true;
}
