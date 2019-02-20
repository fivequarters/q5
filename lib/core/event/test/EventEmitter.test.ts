import { EventEmitter, IEvent } from '../src';

describe('EventEmitter', () => {
  describe('on()', () => {
    it('should add an event listener', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };
      let actual;
      eventEmitter.on('abc', event => (actual = event));
      eventEmitter.emit(toEmit);
      expect(actual).toBe(toEmit);
    });

    it('should get invoked with each emit', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };
      let count = 0;
      eventEmitter.on('abc', event => count++);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);

      eventEmitter.emit(toEmit);
      expect(count).toBe(2);
    });
  });

  describe('once()', () => {
    it('should get invoked with only the next emit', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };
      let count = 0;
      eventEmitter.once('abc', event => count++);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);
    });
  });

  describe('removeListener()', () => {
    it('should remove an existing listener', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };

      let count = 0;
      const listener = (event: IEvent) => count++;
      eventEmitter.on('abc', listener);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);

      eventEmitter.removeListener('abc', listener);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);
    });

    it('should do nothing if no such event', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };

      let count = 0;
      const listener = (event: IEvent) => count++;
      eventEmitter.on('abc', listener);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);

      eventEmitter.removeListener('xyz', listener);

      eventEmitter.emit(toEmit);
      expect(count).toBe(2);
    });

    it('should do nothing if no such listener', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };

      let count = 0;
      const listener = (event: IEvent) => count++;
      eventEmitter.on('abc', listener);

      eventEmitter.emit(toEmit);
      expect(count).toBe(1);

      eventEmitter.removeListener('abc', () => (count += 10));

      eventEmitter.emit(toEmit);
      expect(count).toBe(2);
    });
  });

  describe('emit()', () => {
    it('should do nothing if no such event', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'xyz', message: 'hello' };
      let count = 0;
      eventEmitter.once('abc', event => count++);

      eventEmitter.emit(toEmit);
      expect(count).toBe(0);
    });

    it('should iterate over listeners', () => {
      const eventEmitter = new EventEmitter();
      const toEmit = { name: 'abc', message: 'hello' };
      let count = 0;
      eventEmitter.on('abc', event => count++);
      eventEmitter.on('abc', event => (count += 10));

      eventEmitter.emit(toEmit);
      expect(count).toBe(11);
    });
  });
});
