import { readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { Tsconfig } from '../src/index';

const qrtTsconfig = `{
  "references": [{ "path": "../packages/abc" }, { "path": "../packages/xyz" }]
}`;

const qrtTsconfigEmptyArray = `{
  "references": []
}`;

const qrtTsconfigNoReferences = `{}`;

describe('Tsconfig', () => {
  describe('constructor()', () => {
    it.concurrent('should return an instance with properties set', async () => {
      const path = join(tmpdir(), `testing-tsconfig-1-${Date.now()}`, 'tsconfig.json');
      const tsconfig = new Tsconfig(path);
      expect(tsconfig.Path).toBe(path);
    });
  });

  describe('GetWorkspaceReferences()', () => {
    it.concurrent('should return the workspace references from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-2-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/abc', '../packages/xyz']);
    });
    it.concurrent('should return an empty object if no references in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-3-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigNoReferences);
      const tsconfig = new Tsconfig(path);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
    it.concurrent('should ignore empty workspace references array in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-4-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigEmptyArray);
      const tsconfig = new Tsconfig(path);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
  });

  describe('AddWorkspaceReference()', () => {
    it.concurrent('should add a workspace reference to the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-5-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      await tsconfig.AddWorkspaceReference('../packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([
        { path: '../packages/abc' },
        { path: '../packages/xyz' },
        { path: '../packages/rst' },
      ]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([
        '../packages/abc',
        '../packages/xyz',
        '../packages/rst',
      ]);
    });
    it.concurrent('should add a workspace reference if no references in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-6-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigNoReferences);
      const tsconfig = new Tsconfig(path);
      await tsconfig.AddWorkspaceReference('../packages/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([{ path: '../packages/xyz' }]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/xyz']);
    });
  });

  describe('RemoveWorkspaceReference()', () => {
    it.concurrent('should remove a workspace reference from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-7-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      await tsconfig.RemoveWorkspaceReference('../packages/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([{ path: '../packages/xyz' }]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/xyz']);
    });
    it.concurrent('should do nothing if no workspace references in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-8-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigNoReferences);
      const tsconfig = new Tsconfig(path);
      await tsconfig.RemoveWorkspaceReference('../package/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual(undefined);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
    it.concurrent('should do nothing if empty references array in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-9-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigEmptyArray);
      const tsconfig = new Tsconfig(path);
      await tsconfig.RemoveWorkspaceReference('../package/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
    it.concurrent('should ignore a workspace reference that is not in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-10-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      await tsconfig.RemoveWorkspaceReference('../package/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([{ path: '../packages/abc' }, { path: '../packages/xyz' }]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/abc', '../packages/xyz']);
    });
  });

  describe('UpdateWorkspaceReference()', () => {
    it.concurrent('should update a workspace reference from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-11-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      await tsconfig.UpdateWorkspaceReference('../packages/abc', '../packages/core/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([{ path: '../packages/core/abc' }, { path: '../packages/xyz' }]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/core/abc', '../packages/xyz']);
    });
    it.concurrent('should do nothing if no workspace references in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-12-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigNoReferences);
      const tsconfig = new Tsconfig(path);
      await tsconfig.UpdateWorkspaceReference('../package/abc', '../packages/core/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual(undefined);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
    it.concurrent('should do nothing if empty references array in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-13-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfigEmptyArray);
      const tsconfig = new Tsconfig(path);
      await tsconfig.UpdateWorkspaceReference('../package/abc', '../packages/core/abc');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual([]);
    });
    it.concurrent('should ignore a workspace reference that is not in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-tsconfig-14-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, qrtTsconfig);
      const tsconfig = new Tsconfig(path);
      await tsconfig.UpdateWorkspaceReference('../package/rst', '../package/core/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.references).toEqual([{ path: '../packages/abc' }, { path: '../packages/xyz' }]);
      expect(await tsconfig.GetWorkspaceReferences()).toEqual(['../packages/abc', '../packages/xyz']);
    });
  });
});
