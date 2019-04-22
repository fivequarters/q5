import { Exception } from '../src';

describe('Exception', () => {
  describe('constructor()', () => {
    it('should return an instance of type Error', () => {
      const exception = new Exception();
      expect(exception).toBeInstanceOf(Error);
    });
  });

  describe('code', () => {
    it('should return default value if not set', () => {
      const exception = new Exception();
      expect(exception.code).toBe('unknown');
    });

    it('should return value set in contructor', () => {
      const exception = new Exception('invalidId');
      expect(exception.code).toBe('invalidId');
    });
  });

  describe('message', () => {
    it('should return default empty string by default', () => {
      const exception = new Exception();
      expect(exception.message).toBe('');
    });

    it('should return value set in contructor', () => {
      const exception = new Exception('invalidId', 'The id was invalid');
      expect(exception.message).toBe('The id was invalid');
    });
  });

  describe('stack', () => {
    it('should return a stack trace', () => {
      const exception = new Exception();
      expect(exception.stack).toBeDefined();
    });
  });

  describe('params', () => {
    it('should return an empty array by default', () => {
      const exception = new Exception();
      expect(exception.params).toEqual([]);
    });

    it('should return value set in contructor', () => {
      const exception = new Exception('invalidId', 'The id was invalid', ['id', true, 5]);
      expect(exception.params).toEqual(['id', true, 5]);
    });
  });

  describe('inner', () => {
    it('should return undefined by default', () => {
      const exception = new Exception();
      expect(exception.inner).toBeUndefined();
    });

    it('should return Exception if set in constructor', () => {
      const inner = new Exception('inner');
      const exception = new Exception('invalidId', undefined, undefined, inner);
      expect(exception.inner).toBe(inner);
    });

    it('should wrap an Error if set in the constructor', () => {
      const inner = new Error('an error');
      const exception = new Exception('invalidId', undefined, undefined, inner);
      expect(exception.inner).toBeInstanceOf(Exception);
      if (exception.inner) {
        expect(exception.inner.code).toBe('unknown');
      }
    });
  });
});
