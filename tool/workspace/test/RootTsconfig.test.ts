import { readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { RootTsconfig } from '../src/index';

const rootTsconfig = `{
  "compilerOptions": {
    "paths": {
      "@org/abc": ["packages/abc/src"],
      "@org/xyz": ["packages/xyz/src"]
    }
  }
}`;

const rootTsconfigNoPaths = `{
  "compilerOptions": {}
}`;

const rootTsconfigNoCompilerOptions = `{}`;

const rootTsconfigEmptyArray = `{
  "compilerOptions": {
    "paths": {
      "@org/abc": ["packages/abc/src"],
      "@org/xyz": []
    }
  }
}`;

describe('RootTsconfig', () => {
  describe('constructor()', () => {
    it.concurrent('should return an instance with properties set', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-1-${Date.now()}`, 'tsconfig.json');
      const tsconfig = new RootTsconfig(path);
      expect(tsconfig.Path).toBe(path);
    });
  });
  describe('GetWorkspacePaths()', () => {
    it.concurrent('should return the workspace paths from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-2-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/xyz': 'packages/xyz/src',
      });
    });
    it.concurrent('should return an empty object if no workspace paths in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-3-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoPaths);
      const tsconfig = new RootTsconfig(path);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({});
    });
    it.concurrent('should return an empty object if no compilerOptions in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-4-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoCompilerOptions);
      const tsconfig = new RootTsconfig(path);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({});
    });
    it.concurrent('should ignore empty workspace paths array in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-5-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigEmptyArray);
      const tsconfig = new RootTsconfig(path);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({ '@org/abc': 'packages/abc/src' });
    });
  });
  describe('SetWorkspacePath()', () => {
    it.concurrent('should add a workspace path to the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-6-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.SetWorkspacePath('@org/rst', 'packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths['@org/rst']).toEqual(['packages/rst/src']);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/xyz': 'packages/xyz/src',
        '@org/rst': 'packages/rst/src',
      });
    });
    it.concurrent('should add a workspace path if no workspace paths in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-7-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoPaths);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.SetWorkspacePath('@org/xyz', 'packages/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths['@org/xyz']).toEqual(['packages/xyz/src']);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({ '@org/xyz': 'packages/xyz/src' });
    });
    it.concurrent('should add a workspace path if no compiler options in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-7b-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoCompilerOptions);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.SetWorkspacePath('@org/xyz', 'packages/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths['@org/xyz']).toEqual(['packages/xyz/src']);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({ '@org/xyz': 'packages/xyz/src' });
    });
    it.concurrent('should update a workspace path in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-8-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.SetWorkspacePath('@org/xyz', 'packages/core/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths['@org/xyz']).toEqual(['packages/core/xyz/src']);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/xyz': 'packages/core/xyz/src',
      });
    });
  });
  describe('RemoveWorkspacePath()', () => {
    it.concurrent('should remove a workspace path from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-9-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.RemoveWorkspacePath('@org/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual({ '@org/abc': ['packages/abc/src'] });
      expect(await tsconfig.GetWorkspacePaths()).toEqual({ '@org/abc': 'packages/abc/src' });
    });
    it.concurrent('should do nothing if no workspace paths in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-10-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoPaths);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.RemoveWorkspacePath('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual(undefined);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({});
    });
    it.concurrent('should ignore a workspace path that is not in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-11-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.RemoveWorkspacePath('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual({
        '@org/abc': ['packages/abc/src'],
        '@org/xyz': ['packages/xyz/src'],
      });
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/xyz': 'packages/xyz/src',
      });
    });
  });
  describe('UpdateWorkspacePath()', () => {
    it.concurrent('should update a workspace path from the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-12-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.UpdateWorkspacePath('@org/xyz', '@org/zyx', 'packages/zyx');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual({
        '@org/abc': ['packages/abc/src'],
        '@org/zyx': ['packages/zyx/src'],
      });
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/zyx': 'packages/zyx/src',
      });
    });
    it.concurrent('should update a workspace path and use the existing path in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-13-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.UpdateWorkspacePath('@org/xyz', '@org/zyx');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual({
        '@org/abc': ['packages/abc/src'],
        '@org/zyx': ['packages/xyz/src'],
      });
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/zyx': 'packages/xyz/src',
      });
    });
    it.concurrent('should do nothing if no workspace paths in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-14-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfigNoPaths);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.UpdateWorkspacePath('@org/rst', '@org/tsr');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual(undefined);
      expect(await tsconfig.GetWorkspacePaths()).toEqual({});
    });
    it.concurrent('should ignore a workspace path that is not in the tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-rootTsconfig-15-${Date.now()}`, 'tsconfig.json');
      await writeFile(path, rootTsconfig);
      const tsconfig = new RootTsconfig(path);
      await tsconfig.UpdateWorkspacePath('@org/rst', '@org/tsr');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.compilerOptions.paths).toEqual({
        '@org/abc': ['packages/abc/src'],
        '@org/xyz': ['packages/xyz/src'],
      });
      expect(await tsconfig.GetWorkspacePaths()).toEqual({
        '@org/abc': 'packages/abc/src',
        '@org/xyz': 'packages/xyz/src',
      });
    });
  });
});
