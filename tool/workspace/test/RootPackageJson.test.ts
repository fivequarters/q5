import { readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { RootPackageJson } from '../src/index';

const rootPackageJson = `{
  "private":true,
  "devDependencies": {
    "@org/lol": "^0.0.1",
    "@org/brb": "^0.0.1"
  },
  "workspaces": [
    "packages/abc",
    "packages/xyz"
  ]
}`;

const rootPackageJsonNoDependencies = `{
  "private":true,
  "workspaces": [
    "packages/abc",
    "packages/xyz"
  ]
}`;

const rootPackageJsonNoWorkspaces = `{
  "private":true,
  "devDependencies": {
    "@org/lol": "^0.0.1",
    "@org/brb": "^0.0.1"
  }
}`;

const rootPackageJsonEmptyWorkspaces = `{
  "private":true,
  "devDependencies": {
    "@org/lol": "^0.0.1",
    "@org/brb": "^0.0.1"
  },
  "workspaces": []
}`;

describe('RootPackageJson', () => {
  describe('constructor()', () => {
    it.concurrent('should return an instance with properties set', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-1-${Date.now()}`, 'package.json');
      const packageJson = new RootPackageJson(path);
      expect(packageJson.Path).toBe(path);
    });
  });
  describe('GetDevDependencies()', () => {
    it.concurrent('should return the dependencies from the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-2-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.GetDevDependencies()).toEqual({ '@org/lol': '^0.0.1', '@org/brb': '^0.0.1' });
    });
    it.concurrent('should return an empty object if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-3-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoDependencies);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.GetDevDependencies()).toEqual({});
    });
  });
  describe('SetDevDependency()', () => {
    it.concurrent('should add a dependency to the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-4-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.SetDevDependency('@org/rst', '^0.0.5');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies['@org/rst']).toBe('^0.0.5');
      expect(await packageJson.GetDevDependencies()).toEqual({
        '@org/lol': '^0.0.1',
        '@org/brb': '^0.0.1',
        '@org/rst': '^0.0.5',
      });
    });
    it.concurrent('should add a dependency if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-5-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoDependencies);
      const packageJson = new RootPackageJson(path);
      await packageJson.SetDevDependency('@org/xyz', '^0.0.3');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies['@org/xyz']).toBe('^0.0.3');
      expect(await packageJson.GetDevDependencies()).toEqual({ '@org/xyz': '^0.0.3' });
    });
    it.concurrent('should update a dependency in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-6-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.SetDevDependency('@org/brb', '^0.0.3');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies['@org/brb']).toBe('^0.0.3');
      expect(await packageJson.GetDevDependencies()).toEqual({ '@org/lol': '^0.0.1', '@org/brb': '^0.0.3' });
    });
  });
  describe('RemoveDevDependency()', () => {
    it.concurrent('should remove a dependency from the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-7-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveDevDependency('@org/brb');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies).toEqual({ '@org/lol': '^0.0.1' });
      expect(await packageJson.GetDevDependencies()).toEqual({ '@org/lol': '^0.0.1' });
    });
    it.concurrent('should do nothing if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-8-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoDependencies);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveDevDependency('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies).toEqual(undefined);
      expect(await packageJson.GetDevDependencies()).toEqual({});
    });
    it.concurrent('should ignore a dependency that is not in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-9-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveDevDependency('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies).toEqual({ '@org/lol': '^0.0.1', '@org/brb': '^0.0.1' });
      expect(await packageJson.GetDevDependencies()).toEqual({ '@org/lol': '^0.0.1', '@org/brb': '^0.0.1' });
    });
  });
  describe('GetWorkspacePaths()', () => {
    it.concurrent('should return the workspace paths from the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-10-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc', 'packages/xyz']);
    });
    it.concurrent('should return an empty object if no workspace paths in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-11-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoWorkspaces);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.GetWorkspacePaths()).toEqual([]);
    });
  });
  describe('AddWorkspacePath()', () => {
    it.concurrent('should add a workspace path to the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-12-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.AddWorkspacePath('packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/abc', 'packages/xyz', 'packages/rst']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc', 'packages/xyz', 'packages/rst']);
    });
    it.concurrent('should add a workspace path if no workspace paths in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-13-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoWorkspaces);
      const packageJson = new RootPackageJson(path);
      await packageJson.AddWorkspacePath('packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/rst']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/rst']);
    });
  });
  describe('RemoveWorkspacePath()', () => {
    it.concurrent('should remove a workspace path from the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-14-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveWorkspacePath('packages/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/abc']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc']);
    });
    it.concurrent('should ignore a workspace path not in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-15-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveWorkspacePath('packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/abc', 'packages/xyz']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc', 'packages/xyz']);
    });
    it.concurrent('should do nothing if no workspace paths in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-16-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoWorkspaces);
      const packageJson = new RootPackageJson(path);
      await packageJson.RemoveWorkspacePath('packages/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(undefined);
      expect(await packageJson.GetWorkspacePaths()).toEqual([]);
    });
  });
  describe('UpdateWorkspacePath()', () => {
    it.concurrent('should update a workspace path from the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-17-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.UpdateWorkspacePath('packages/xyz', 'packages/core/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/abc', 'packages/core/xyz']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc', 'packages/core/xyz']);
    });
    it.concurrent('should ignore a workspace path not in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-18-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      await packageJson.UpdateWorkspacePath('packages/rst', 'packages/core/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(['packages/abc', 'packages/xyz']);
      expect(await packageJson.GetWorkspacePaths()).toEqual(['packages/abc', 'packages/xyz']);
    });
    it.concurrent('should do nothing if no workspace paths in the package.json', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-19-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoWorkspaces);
      const packageJson = new RootPackageJson(path);
      await packageJson.UpdateWorkspacePath('packages/rst', 'packages/core/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.workspaces).toEqual(undefined);
      expect(await packageJson.GetWorkspacePaths()).toEqual([]);
    });
  });
  describe('HasWorkspacesProperty()', () => {
    it.concurrent('should be true for a package.json with workspaces', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-20-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJson);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.HasWorkspacesProperty()).toBe(true);
    });
    it.concurrent('should be true for a package.json with an empty workspaces array', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-21-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonEmptyWorkspaces);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.HasWorkspacesProperty()).toBe(true);
    });
    it.concurrent('should be false for a package.json with no workspaces array', async () => {
      const path = join(tmpdir(), `testing-rootPackageJson-22-${Date.now()}`, 'package.json');
      await writeFile(path, rootPackageJsonNoWorkspaces);
      const packageJson = new RootPackageJson(path);
      expect(await packageJson.HasWorkspacesProperty()).toBe(false);
    });
  });
});
