// ------------------
// Internal Constants
// ------------------

const objectToString = Object.prototype.toString;

// ------------------
// Exported Functions
// ------------------

export function is(value: any): boolean {
  return value !== undefined && value !== null;
}

export function isBoolean(value: any): boolean {
  return typeof value === 'boolean';
}

export function isString(value: any): boolean {
  return typeof value === 'string';
}

export function isNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !isArray(value);
}

export function isArray(value: any): boolean {
  return Array.isArray(value);
}

export function isFunction(value: any): boolean {
  return value !== null && objectToString.call(value) === '[object Function]';
}

export function isDate(value: any): boolean {
  return value !== null && objectToString.call(value) === '[object Date]';
}

export function isError(value: any): boolean {
  return value !== null && objectToString.call(value) === '[object Error]';
}

export function isRegExp(value: any): boolean {
  return value !== null && objectToString.call(value) === '[object RegExp]';
}

export function asBoolean(value: any): boolean | undefined {
  return isBoolean(value) ? value : undefined;
}

export function asString(value: any): string | undefined {
  return isString(value) ? value : undefined;
}

export function asNumber(value: any): number | undefined {
  return isNumber(value) ? value : undefined;
}

export function asObject(value: any): object | undefined {
  return isObject(value) ? value : undefined;
}

export function asArray(value: any): Array<any> | undefined {
  return isArray(value) ? value : undefined;
}

export function asDate(value: any): Date | undefined {
  return isDate(value) ? value : undefined;
}

export function asError(value: any): Error | undefined {
  return isError(value) ? value : undefined;
}

export function asRegExp(value: any): RegExp | boolean {
  return isRegExp(value) ? value : undefined;
}

export function ensureArray(value: any): Array<any> {
  return isArray(value) ? value : [value];
}
