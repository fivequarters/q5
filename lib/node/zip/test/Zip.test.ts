import { Zip } from '../src';

describe('Zip', () => {
  describe('create()', () => {
    it('should return a Zip instance', async () => {
      const zip = await Zip.create();
      expect(zip).toBeInstanceOf(Zip);
    });
  });

  describe('addFile()', () => {
    it('should add a file and content', async () => {
      const zip = await Zip.create();
      zip.addFile('foo/bar.txt', 'Hello World');
    });
  });

  describe('generate()', () => {
    it('should return a buffer with the zip file content', async () => {
      const zip = await Zip.create();
      zip.addFile('foo/bar.txt', 'Hello World');
      const buffer = await zip.generate();
      const newZip = await Zip.create(buffer);
      const content = await newZip.getFile('foo/bar.txt');
      expect(content).toBe('Hello World');
    });
  });
});
