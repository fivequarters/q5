import {
  asArray,
  asBoolean,
  asDate,
  asError,
  asNumber,
  asObject,
  asRegExp,
  asString,
  ensureArray,
  is,
  isArray,
  isBoolean,
  isDate,
  isError,
  isFunction,
  isNumber,
  isObject,
  isRegExp,
  isString,
} from '../src';

class TestClass {
  public static do() {
    return true;
  }

  public do() {
    return true;
  }
}

describe('is', () => {
  it('should return true for non-null and non-undefined values', () => {
    const tests = [0, '', [], {}, NaN, 0.000001, /\d*/];
    for (const test of tests) {
      expect(is(test)).toBe(true);
    }
  });
  it('should return false null and undefined values', () => {
    const tests = [null, undefined];
    for (const test of tests) {
      expect(is(test)).toBe(false);
    }
  });
});

describe('isBoolean', () => {
  it('should return true for boolean values', () => {
    const tests = [true, false];
    for (const test of tests) {
      expect(isBoolean(test)).toBe(true);
    }
  });
  it('should return false for non-boolean values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      [],
      {},
      'true',
      5,
      0.0001,
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isBoolean(test)).toBe(false);
    }
  });
});

describe('isString', () => {
  it('should return true for string values', () => {
    const tests = ['', 'hello', '5'];
    for (const test of tests) {
      expect(isString(test)).toBe(true);
    }
  });
  it('should return false for non-string values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      [],
      {},
      5,
      0.0001,
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isString(test)).toBe(false);
    }
  });
});

describe('isNumber', () => {
  it('should return true for number values', () => {
    const tests = [
      5,
      0.0001,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.EPSILON,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
    ];
    for (const test of tests) {
      expect(isNumber(test)).toBe(true);
    }
  });
  it('should return false for non-number values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      [],
      {},
      '',
      'hello',
      '5',
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isNumber(test)).toBe(false);
    }
  });
});

describe('isObject', () => {
  it('should return true for object values', () => {
    const tests = [{}, { hey: 5 }, new TestClass(), new Object(), new Error('an error'), new Date(), /\s*/];
    for (const test of tests) {
      expect(isObject(test)).toBe(true);
    }
  });
  it('should return false for non-object values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      [],
      5,
      0.0001,
      '',
      'hello',
      '5',
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      TestClass.do,
      new TestClass().do,
    ];
    for (const test of tests) {
      expect(isObject(test)).toBe(false);
    }
  });
});

describe('isArray', () => {
  it('should return true for array values', () => {
    const tests = [[], new Array(5), [1, 2, 3]];
    for (const test of tests) {
      expect(isArray(test)).toBe(true);
    }
  });
  it('should return false for non-array values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isArray(test)).toBe(false);
    }
  });
});

describe('isFunction', () => {
  it('should return true for function values', () => {
    const tests = [
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      TestClass.do,
      new TestClass().do,
    ];
    for (const test of tests) {
      expect(isFunction(test)).toBe(true);
    }
  });
  it('should return false for non-function values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      new Error('an error'),
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isFunction(test)).toBe(false);
    }
  });
});

describe('isDate', () => {
  it('should return true for Date values', () => {
    const tests = [new Date()];
    for (const test of tests) {
      expect(isDate(test)).toBe(true);
    }
  });
  it('should return false for non-Date values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isDate(test)).toBe(false);
    }
  });
});

describe('isError', () => {
  it('should return true for Error values', () => {
    const tests = [new Error('an error')];
    for (const test of tests) {
      expect(isError(test)).toBe(true);
    }
  });
  it('should return false for non-Error values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(isError(test)).toBe(false);
    }
  });
});

describe('isRegExp', () => {
  it('should return true for RegExp values', () => {
    const tests = [/\s*/, new RegExp('s*')];
    for (const test of tests) {
      expect(isRegExp(test)).toBe(true);
    }
  });
  it('should return false for non-RegExp values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Date(),
      new Error('an error'),
    ];
    for (const test of tests) {
      expect(isRegExp(test)).toBe(false);
    }
  });
});

describe('asBoolean', () => {
  it('should return the boolean for boolean values', () => {
    const tests = [true, false];
    for (const test of tests) {
      expect(asBoolean(test)).toBe(test);
    }
  });
  it('should return undefined for non-boolean values', () => {
    const tests = [null, undefined, NaN, [], {}, 'true', 5, 0.0001, new TestClass()];
    for (const test of tests) {
      expect(asBoolean(test)).toBe(undefined);
    }
  });
});

describe('asString', () => {
  it('should return the string for string values', () => {
    const tests = ['', 'hello', '5'];
    for (const test of tests) {
      expect(asString(test)).toBe(test);
    }
  });
  it('should return undefined for non-string values', () => {
    const tests = [null, undefined, NaN, [], {}, 5, 0.0001, new TestClass()];
    for (const test of tests) {
      expect(asString(test)).toBe(undefined);
    }
  });
});

describe('asNumber', () => {
  it('should return the number for number values', () => {
    const tests = [
      5,
      0.0001,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.EPSILON,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
    ];
    for (const test of tests) {
      expect(asNumber(test)).toBe(test);
    }
  });
  it('should return undefined for non-number values', () => {
    const tests = [null, undefined, NaN, [], {}, '', 'hello', '5', new TestClass()];
    for (const test of tests) {
      expect(asNumber(test)).toBe(undefined);
    }
  });
});

describe('asObject', () => {
  it('should return the object for object values', () => {
    const tests = [{}, { hey: 5 }, new TestClass(), new Object()];
    for (const test of tests) {
      expect(asObject(test)).toBe(test);
    }
  });
  it('should return undefined for non-object values', () => {
    const tests = [null, undefined, NaN, [], 5, 0.0001, '', 'hello', '5'];
    for (const test of tests) {
      expect(asObject(test)).toBe(undefined);
    }
  });
});

describe('asArray', () => {
  it('should return the array for array values', () => {
    const tests = [[], new Array(5), [1, 2, 3]];
    for (const test of tests) {
      expect(asArray(test)).toBe(test);
    }
  });
  it('should return undefined for non-array values', () => {
    const tests = [null, undefined, NaN, 5, 0.0001, '', 'hello', '5', {}, new TestClass()];
    for (const test of tests) {
      expect(asArray(test)).toBe(undefined);
    }
  });
});

describe('asDate', () => {
  it('should return the Date for Date values', () => {
    const tests = [new Date()];
    for (const test of tests) {
      expect(asDate(test)).toBe(test);
    }
  });
  it('should return undefined for non-Date values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Error('an error'),
      /\s*/,
    ];
    for (const test of tests) {
      expect(asDate(test)).toBe(undefined);
    }
  });
});

describe('asError', () => {
  it('should return the Error for Error values', () => {
    const tests = [new Error('an error')];
    for (const test of tests) {
      expect(asError(test)).toBe(test);
    }
  });
  it('should return undefined for non-Error values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Date(),
      /\s*/,
    ];
    for (const test of tests) {
      expect(asError(test)).toBe(undefined);
    }
  });
});

describe('asRegExp', () => {
  it('should return the RegExp for RegExp values', () => {
    const tests = [/\s*/, new RegExp('s*')];
    for (const test of tests) {
      expect(asRegExp(test)).toBe(test);
    }
  });
  it('should return undefined for non-RegExp values', () => {
    const tests = [
      null,
      undefined,
      NaN,
      5,
      0.0001,
      '',
      'hello',
      '5',
      {},
      new TestClass(),
      () => true,
      // tslint:disable-next-line
      function () {
        return true;
      },
      new Date(),
      new Error('an error'),
    ];
    for (const test of tests) {
      expect(asRegExp(test)).toBe(undefined);
    }
  });
});

describe('ensureArray', () => {
  it('should return the array for array values', () => {
    const tests = [[], new Array(5), [1, 2, 3]];
    for (const test of tests) {
      expect(ensureArray(test)).toBe(test);
    }
  });
  it('should return an array for non-array values', () => {
    const tests = [null, undefined, NaN, 5, 0.0001, '', 'hello', '5', {}, new TestClass()];
    for (const test of tests) {
      expect(ensureArray(test)[0]).toBe(test);
    }
  });
});
