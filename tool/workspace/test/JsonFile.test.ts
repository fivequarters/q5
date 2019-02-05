import { readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { JsonFile } from '../src';

class JsonFileExtended extends JsonFile {
  constructor(path: string) {
    super(path);
  }

  public GetContents() {
    return this.contents;
  }

  public SetContents(contents: any) {
    this.contents = contents;
  }

  public async LoadContent() {
    await super.Load();
  }

  public async SaveContent() {
    await super.Save();
  }
}

describe('JsonFile', () => {
  describe('constructor()', () => {
    it('should return an instance with properties set', async () => {
      const path = join(tmpdir(), `testing-jsonfile-1-${Date.now()}`);
      const jsonfile = new JsonFile(path);
      expect(jsonfile.Path).toBe(path);
    });
  });

  describe('load()', () => {
    it('should load the json contents of a file', async () => {
      const path = join(tmpdir(), `testing-jsonfile-2-${Date.now()}`);
      const file1Path = join(path, 'file1.json');
      await writeFile(file1Path, '{"data": { "number": 1, "text":"hello"}}');

      const jsonfile = new JsonFileExtended(file1Path);
      await jsonfile.LoadContent();
      const actual = jsonfile.GetContents();
      expect(actual.data.number).toBe(1);
      expect(actual.data.text).toBe('hello');
    });

    it('should error if the file does not exist', async () => {
      const path = join(tmpdir(), `testing-jsonfile-3-${Date.now()}`);
      const file1Path = join(path, 'file1.json');
      const jsonfile = new JsonFileExtended(file1Path);

      let actual;
      try {
        await jsonfile.LoadContent();
      } catch (error) {
        actual = error;
      }

      expect(actual.message).toBe(`Error reading '${file1Path}'; File not found`);
    });

    it('should error if the json is invalid', async () => {
      const path = join(tmpdir(), `testing-jsonfile-4-${Date.now()}`);
      const file1Path = join(path, 'file1.json');
      await writeFile(file1Path, '{"data": { oops }}');
      const jsonfile = new JsonFileExtended(file1Path);

      let actual;
      try {
        await jsonfile.LoadContent();
      } catch (error) {
        actual = error;
      }

      expect(actual.message).toBe(
        `Error parsing '${file1Path}'; SyntaxError: Unexpected token o in JSON at position 11`
      );
    });
  });

  describe('save()', () => {
    it('should save the json content to the file', async () => {
      const path = join(tmpdir(), `testing-jsonfile-5-${Date.now()}`);
      const file1Path = join(path, 'file1.json');

      const jsonfile = new JsonFileExtended(file1Path);
      jsonfile.SetContents({ data: { number: 2, text: 'Hey' } });
      await jsonfile.SaveContent();

      const actual = JSON.stringify(JSON.parse((await readFile(file1Path)).toString()));
      expect(actual).toBe('{"data":{"number":2,"text":"Hey"}}');
    });

    it('should save the json content to the file', async () => {
      const path = join(tmpdir(), `testing-jsonfile-6-${Date.now()}`);
      const file1Path = join(path, 'file1.json');
      await writeFile(file1Path, '{"data": { "number": 1, "text":"hello"}}');

      const jsonfile = new JsonFileExtended(file1Path);
      jsonfile.SetContents({ data: { number: 2, text: 'Hey' } });
      await jsonfile.SaveContent();

      const actual = JSON.stringify(JSON.parse((await readFile(file1Path)).toString()));
      expect(actual).toBe('{"data":{"number":2,"text":"Hey"}}');
    });
  });
});
