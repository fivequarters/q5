import { isArray, isDate, isObject } from '@5qtrs/type';

// ------------------
// Exported Functions
// ------------------

export function clone(value: any): any {
  if (isDate(value)) {
    return new Date((value as Date).getTime());
  }
  if (isArray(value)) {
    return value.map(clone);
  }
  if (isObject(value)) {
    return Object.keys(value).reduce((sum, key) => {
      sum[key] = clone(value[key]);
      return sum;
    }, {} as any);
  }

  return value;
}
