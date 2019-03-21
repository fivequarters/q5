import { ArgType, Option } from '../src';

describe('Option', () => {
  describe('constructor()', () => {
    it('should return an instance of Option', () => {
      const option = new Option({ name: 'abc' });
      expect(option).toBeInstanceOf(Option);
    });
  });

  describe('name', () => {
    it('should return the name of the option', () => {
      const option = new Option({ name: 'abc' });
      expect(option.name).toBe('abc');
    });
    it('should be immutable', () => {
      const values = { name: 'abc' };
      const option = new Option(values);
      values.name = 'not abc';
      expect(option.name).toBe('abc');
    });
  });

  describe('aliases', () => {
    it('should return the array of aliases', () => {
      const option = new Option({ name: 'abc', aliases: ['foo', 'bar'] });
      expect(option.aliases).toEqual(['foo', 'bar']);
    });
    it('should be an empty array if not set', () => {
      const option = new Option({ name: 'abc' });
      expect(option.aliases).toEqual([]);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', aliases: ['foo', 'bar'] };
      const option = new Option(values);
      values.aliases.push('other');
      option.aliases.push('and another');
      expect(option.aliases).toEqual(['foo', 'bar']);
    });
  });

  describe('type', () => {
    it('should return the ArgType', () => {
      const option = new Option({ name: 'abc', type: ArgType.integer });
      expect(option.type).toBe(ArgType.integer);
    });
    it('should be a string ArgType by default', () => {
      const option = new Option({ name: 'abc' });
      expect(option.type).toBe(ArgType.string);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', type: ArgType.integer };
      const option = new Option(values);
      values.type = ArgType.float;
      expect(option.type).toBe(ArgType.integer);
    });
  });

  describe('default', () => {
    it('should return the default value', () => {
      const option = new Option({ name: 'abc', default: 'foo' });
      expect(option.default).toBe('foo');
    });
    it('should return undefined by default', () => {
      const option = new Option({ name: 'abc' });
      expect(option.default).toBe(undefined);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', default: 'foo' };
      const option = new Option(values);
      values.default = 'bar';
      expect(option.default).toBe('foo');
    });
  });

  describe('description', () => {
    it('should return the description', () => {
      const option = new Option({ name: 'abc', description: 'foo' });
      expect(option.description).toBe('foo');
    });
    it('should return empty string by default', () => {
      const option = new Option({ name: 'abc' });
      expect(option.description.toString()).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', description: 'foo' };
      const option = new Option(values);
      values.description = 'bar';
      expect(option.description).toBe('foo');
    });
  });

  describe('allowMany', () => {
    it('should return the allowMany value', () => {
      const option = new Option({ name: 'abc', allowMany: true });
      expect(option.allowMany).toBe(true);
    });
    it('should return false by default', () => {
      const option = new Option({ name: 'abc' });
      expect(option.allowMany).toBe(false);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', allowMany: true };
      const option = new Option(values);
      values.allowMany = false;
      expect(option.allowMany).toBe(true);
    });
  });
});
