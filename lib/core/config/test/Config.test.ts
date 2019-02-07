import { Config } from '../src';

describe('Config', () => {
  describe('constructor()', () => {
    it('should return a Config instance', () => {
      const config = new Config({ foo: 5 });
      expect(config).toBeInstanceOf(Config);
    });

    it('should ensure settings can not be altered post create', () => {
      const server = { foo: 5 };
      const config = new Config(server);
      server.foo = 9;
      expect(config.value('foo')).toBe(5);
    });
  });

  describe('Value()', () => {
    it('should return a settings', () => {
      const config = new Config({ foo: 5 });
      expect(config.value('foo')).toBe(5);
    });

    it('should return undefined for non-existing settings', () => {
      const config = new Config({ foo: 5 });
      expect(config.value('bar')).toBe(undefined);
    });
  });
});
