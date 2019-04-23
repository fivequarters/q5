import { ArgType, Argument } from '../src';

describe('Argument', () => {
  describe('constructor()', () => {
    it('should return an instance of Argument', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument).toBeInstanceOf(Argument);
    });
  });

  describe('name', () => {
    it('should return the name of the argument', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument.name).toBe('abc');
    });
    it('should be immutable', () => {
      const values = { name: 'abc' };
      const argument = new Argument(values);
      values.name = 'not abc';
      expect(argument.name).toBe('abc');
    });
  });

  describe('type', () => {
    it('should return the ArgType', () => {
      const argument = new Argument({ name: 'abc', type: ArgType.integer });
      expect(argument.type).toBe(ArgType.integer);
    });
    it('should be a string ArgType by default', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument.type).toBe(ArgType.string);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', type: ArgType.integer };
      const argument = new Argument(values);
      values.type = ArgType.float;
      expect(argument.type).toBe(ArgType.integer);
    });
  });

  describe('default', () => {
    it('should return the default value', () => {
      const argument = new Argument({ name: 'abc', default: 'foo' });
      expect(argument.default).toBe('foo');
    });
    it('should return undefined by default', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument.default).toBe(undefined);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', default: 'foo' };
      const argument = new Argument(values);
      values.default = 'bar';
      expect(argument.default).toBe('foo');
    });
  });

  describe('description', () => {
    it('should return the description', () => {
      const argument = new Argument({ name: 'abc', description: 'foo' });
      expect(argument.description).toBe('foo');
    });
    it('should return empty string by default', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument.description.toString()).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', description: 'foo' };
      const argument = new Argument(values);
      values.description = 'bar';
      expect(argument.description).toBe('foo');
    });
  });

  describe('required', () => {
    it('should return the allowMany value', () => {
      const argument = new Argument({ name: 'abc', required: false });
      expect(argument.required).toBe(false);
    });
    it('should return true by default', () => {
      const argument = new Argument({ name: 'abc' });
      expect(argument.required).toBe(true);
    });
    it('should return false if default is set', () => {
      const argument = new Argument({ name: 'abc', default: 'hello' });
      expect(argument.required).toBe(false);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', required: false };
      const argument = new Argument(values);
      values.required = true;
      expect(argument.required).toBe(false);
    });
  });
});
