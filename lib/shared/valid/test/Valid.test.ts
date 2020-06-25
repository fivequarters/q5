import { Valid } from '../src';

class TestClass {
  get value() {
    return 5;
  }
}

const isTrue = () => true;
const isFalse = () => false;

const isFive = (value: any) => value === 5;
const isNotFive = (value: any) => value !== 5;

const isTrueValid = Valid.create(isTrue);
const isFalseValid = Valid.create(isFalse);

describe('Valid', () => {
  describe('create', () => {
    it('should return a valid instance', () => {
      expect(Valid.create(isTrue)).toBeInstanceOf(Valid);
    });

    it('should initialize with a true validator by default', () => {
      expect(Valid.create().validate(5)).toBe(true);
    });

    it('should support both valid instances and validator functions', () => {
      expect(Valid.create(isTrue).validate(5)).toBe(true);
      expect(Valid.create(isTrueValid).validate(5)).toBe(true);
    });
  });

  describe('is', () => {
    it('should return true for non-null and non-undefined values', () => {
      const tests = [0, '', [], {}, NaN, 0.000001, /\d*/];
      for (const test of tests) {
        expect(Valid.is().validate(test)).toBe(true);
      }
    });

    it('should return false null and undefined values', () => {
      const tests = [null, undefined];
      for (const test of tests) {
        expect(Valid.is().validate(test)).toBe(false);
      }
    });
  });

  describe('isBoolean', () => {
    it('should return true for boolean values', () => {
      const tests = [true, false];
      for (const test of tests) {
        expect(Valid.isBoolean().validate(test)).toBe(true);
      }
    });

    it('should return false for non-boolean values', () => {
      const tests = [null, undefined, NaN, [], {}, 'true', 5, 0.0001, new TestClass()];
      for (const test of tests) {
        expect(Valid.isBoolean().validate(test)).toBe(false);
      }
    });
  });

  describe('isString', () => {
    it('should return true for string values', () => {
      const tests = ['', 'hello', '5'];
      for (const test of tests) {
        expect(Valid.isString().validate(test)).toBe(true);
      }
    });

    it('should return false for non-string values', () => {
      const tests = [null, undefined, NaN, [], {}, 5, 0.0001, new TestClass()];
      for (const test of tests) {
        expect(Valid.isString().validate(test)).toBe(false);
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
        expect(Valid.isNumber().validate(test)).toBe(true);
      }
    });

    it('should return false for non-number values', () => {
      const tests = [null, undefined, NaN, [], {}, '', 'hello', '5', new TestClass()];
      for (const test of tests) {
        expect(Valid.isNumber().validate(test)).toBe(false);
      }
    });
  });

  describe('isObject', () => {
    it('should return true for object values', () => {
      const tests = [{}, { hey: 5 }, new TestClass(), new Object()];
      for (const test of tests) {
        expect(Valid.isObject().validate(test)).toBe(true);
      }
    });

    it('should return false for non-object values', () => {
      const tests = [null, undefined, NaN, [], 5, 0.0001, '', 'hello', '5'];
      for (const test of tests) {
        expect(Valid.isObject().validate(test)).toBe(false);
      }
    });
  });

  describe('isArray', () => {
    it('should return true for array values', () => {
      const tests = [[], new Array(5), [1, 2, 3]];
      for (const test of tests) {
        expect(Valid.isArray().validate(test)).toBe(true);
      }
    });

    it('should return false for non-array values', () => {
      const tests = [null, undefined, NaN, 5, 0.0001, '', 'hello', '5', {}, new TestClass()];
      for (const test of tests) {
        expect(Valid.isArray().validate(test)).toBe(false);
      }
    });
  });

  describe('isInteger', () => {
    it('should return true for integer values', () => {
      const tests = [0, 5, -5, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];
      for (const test of tests) {
        expect(Valid.isInteger().validate(test)).toBe(true);
      }
    });

    it('should return false for non-integer values', () => {
      const tests = [
        null,
        undefined,
        NaN,
        [],
        {},
        '',
        'hello',
        '5',
        0.1,
        Number.MIN_VALUE,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.EPSILON,
        new TestClass(),
      ];
      for (const test of tests) {
        expect(Valid.isInteger().validate(test)).toBe(false);
      }
    });
  });

  describe('and', () => {
    it('should return true if all validators return true', () => {
      const valid = Valid.and(isTrue, isFive, isFive);
      expect(valid.validate(5)).toBe(true);
    });

    it('should return false if any validators return false', () => {
      const tests = [
        [isTrue, isFive, isNotFive],
        [isNotFive, isFive, isTrue],
        [isFalse, isTrue, isFive],
      ];
      for (const test of tests) {
        const valid = Valid.and(...test);
        expect(valid.validate(5)).toBe(false);
      }
    });

    it('should support both valid instances and validator functions', () => {
      const valid = Valid.and(isTrue, Valid.is(), isTrueValid);
      expect(valid.validate(5)).toBe(true);
    });

    it('should short-circuit validator functions', () => {
      let executed = false;
      const validator = () => (executed = true);
      const valid = Valid.and(isFalse, validator);
      expect(valid.validate(5)).toBe(false);
      expect(executed).toBe(false);
    });
  });

  describe('or', () => {
    it('should return true if any validators return true', () => {
      const tests = [
        [isFalse, isFive, isNotFive],
        [isNotFive, isFive, isFalse],
        [isFalse, isTrue, isNotFive],
      ];
      for (const test of tests) {
        const valid = Valid.or(...test);
        expect(valid.validate(5)).toBe(true);
      }
    });

    it('should return false if all validators return false', () => {
      const valid = Valid.or(isFalse, isFalse, isNotFive);
      expect(valid.validate(5)).toBe(false);
    });

    it('should support both valid instances and validator functions', () => {
      const valid = Valid.or(isFalse, Valid.is(), isFalseValid);
      expect(valid.validate(5)).toBe(true);
    });

    it('should short-circuit validator functions', () => {
      let executed = false;
      const validator = () => (executed = true);
      const valid = Valid.or(isTrue, validator);
      expect(valid.validate(5)).toBe(true);
      expect(executed).toBe(false);
    });
  });

  describe('not', () => {
    it('should return true if the validator return false', () => {
      const valid = Valid.not(isNotFive);
      expect(valid.validate(5)).toBe(true);
    });

    it('should return false if the validator return true', () => {
      const valid = Valid.not(isFive);
      expect(valid.validate(5)).toBe(false);
    });

    it('should support both valid instances and validator functions', () => {
      const valid = Valid.not(Valid.is());
      expect(valid.validate(5)).toBe(false);
      const valid2 = Valid.not(isTrue);
      expect(valid2.validate(5)).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should return true if the value is an object with the property with the valid value', () => {
      const tests = [
        ['name', Valid.isString(), { name: 'hello' }],
        ['value', Valid.isInteger(), new TestClass()],
      ];
      for (const test of tests) {
        const [name, validator, item] = test;
        expect(Valid.hasProperty(name as string, validator as Valid).validate(item)).toBe(true);
      }
    });

    it('should return false if the value is not an object', () => {
      const tests = [
        ['name', Valid.isString(), 5],
        ['value', Valid.isInteger(), [{ value: 5 }]],
      ];
      for (const test of tests) {
        const [name, validator, item] = test;
        expect(Valid.hasProperty(name as string, validator as Valid).validate(item)).toBe(false);
      }
    });

    it('should return false if the property does not exist', () => {
      const tests = [
        ['name', Valid.isString(), { value: 'hello' }],
        ['name', Valid.isInteger(), new TestClass()],
      ];
      for (const test of tests) {
        const [name, validator, item] = test;
        expect(Valid.hasProperty(name as string, validator as Valid).validate(item)).toBe(false);
      }
    });

    it('should return false if the property value is invalid', () => {
      const tests = [
        ['name', Valid.isString(), { name: 5 }],
        ['value', Valid.isObject(), new TestClass()],
      ];
      for (const test of tests) {
        const [name, validator, item] = test;
        expect(Valid.hasProperty(name as string, validator as Valid).validate(item)).toBe(false);
      }
    });

    it('should support both valid instances and validator functions', () => {
      expect(Valid.hasProperty('value', isFive).validate({ value: 5 })).toBe(true);
      expect(Valid.hasProperty('value', Valid.create(isFive)).validate({ value: 5 })).toBe(true);
    });
  });

  describe('isArrayOf', () => {
    it('should return true if every value in the array is valid', () => {
      const tests = [
        [Valid.isString(), ['', 'hello']],
        [Valid.isInteger(), [5, -5, 0]],
      ];
      for (const test of tests) {
        const [validator, item] = test;
        expect(Valid.isArrayOf(validator as Valid).validate(item)).toBe(true);
      }
    });

    it('should return false if the value is not an array', () => {
      const tests = [
        [Valid.isString(), { value: 5 }],
        [Valid.isInteger(), 5],
      ];
      for (const test of tests) {
        const [validator, item] = test;
        expect(Valid.isArrayOf(validator as Valid).validate(item)).toBe(false);
      }
    });

    it('should return false if any value in the array is invalid', () => {
      const tests = [
        [Valid.isString(), ['', 'hello', 5]],
        [Valid.isInteger(), [[], 5, -5, 0]],
      ];
      for (const test of tests) {
        const [validator, item] = test;
        expect(Valid.isArrayOf(validator as Valid).validate(item)).toBe(false);
      }
    });

    it('should support both valid instances and validator functions', () => {
      expect(Valid.isArrayOf(isFive).validate([5, 5])).toBe(true);
      expect(Valid.isArrayOf(Valid.create(isFive)).validate([5, 5])).toBe(true);
    });
  });

  describe('isOneOf', () => {
    it('should return true if the value is in the array of valid values', () => {
      const tests = [
        [['', 'hello'], 'hello'],
        [['', 'hello', 5], 5],
      ];
      for (const test of tests) {
        const [items, item] = test;
        expect(Valid.isOneOf(items as Array<string>).validate(item)).toBe(true);
      }
    });

    it('should return false if the value is not in the array of valid values', () => {
      const tests = [
        [['', 'hello'], 5],
        [['', 'hello', 5], false],
      ];
      for (const test of tests) {
        const [items, item] = test;
        expect(Valid.isOneOf(items as Array<string>).validate(item)).toBe(false);
      }
    });
  });

  describe('match', () => {
    it('should return true if regex matches the value', () => {
      const tests = [
        [/^\d*$/, '100'],
        [/^\w*$/, 'hello'],
      ];
      for (const test of tests) {
        const [regex, item] = test;
        expect(Valid.match(regex as RegExp).validate(item)).toBe(true);
      }
    });

    it('should return false if regex does not match the value', () => {
      const tests = [
        [/^\d*$/, '100px'],
        [/^\w*$/, 'hello  !'],
      ];
      for (const test of tests) {
        const [regex, item] = test;
        expect(Valid.match(regex as RegExp).validate(item)).toBe(false);
      }
    });
  });

  describe('isLowerCase', () => {
    it('should return true for lower case string values', () => {
      const tests = ['', 'hello', '5', '!'];
      for (const test of tests) {
        expect(Valid.isLowerCase().validate(test)).toBe(true);
      }
    });

    it('should return false for non-lower case string values', () => {
      const tests = [null, undefined, NaN, 'Hello', [], {}, 5, 0.0001, new TestClass()];
      for (const test of tests) {
        expect(Valid.isLowerCase().validate(test)).toBe(false);
      }
    });
  });

  describe('isUpperCase', () => {
    it('should return true for upper case string values', () => {
      const tests = ['', 'HELLO', '5', '!'];
      for (const test of tests) {
        expect(Valid.isUpperCase().validate(test)).toBe(true);
      }
    });

    it('should return false for non-lower case string values', () => {
      const tests = [null, undefined, NaN, 'Hello', [], {}, 5, 0.0001, new TestClass()];
      for (const test of tests) {
        expect(Valid.isUpperCase().validate(test)).toBe(false);
      }
    });
  });

  describe('composite validators', () => {
    it('should work correctly for an object', () => {
      const objectValid = Valid.and(
        Valid.hasProperty('name', Valid.isOneOf(['peter', 'paul'])),
        Valid.hasProperty(
          'age',
          Valid.and(Valid.isNumber(), (value) => value > 0)
        )
      );

      const tests = [
        [{ name: 'paul', age: 30 }, true],
        [{ name: 'peter', age: 5 }, true],
        [{ name: 'peter' }, false],
        [{ age: 5 }, false],
        [{ name: 'phil', age: 55 }, false],
        [{ name: 'peter', age: -5 }, false],
      ];

      for (const test of tests) {
        const [item, expected] = test;
        expect(objectValid.validate(item)).toBe(expected);
      }
    });
  });
});
