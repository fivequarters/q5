import { isFile, readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { Writable } from 'stream';
import Project from '../src/Project';
import Workspace from '../src/Workspace';

const rootPackageJson = `{
  "private": true,
  "workspaces": [
    "abc",
    "xyz"
  ]
}`;

const abcPackageJson = `{
  "name": "@org/abc",
  "version": "0.0.1",
  "scripts": {
    "hello": "echo hello"
  }
}`;

const xyzPackageJson = `{
  "name": "@org/xyz",
  "version": "0.0.1",
  "scripts": {
    "hello": "echo hello"
  },
  "dependencies": {
    "@org/abc": "^0.0.1",
    "some-dependency": "^5.0.5"
  }
}`;

const rootTsConfig = `{
  "compilerOptions": {
    "target": "es2015",
    "module": "commonJs",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "composite": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@org/abc": ["abc/src"],
      "@org/xyz": ["xyz/src"]
    }
  }
}`;

const abcTsConfig = `{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib"
  },
  "include": ["src"],
  "references": []
}`;

const xyzTsConfig = `{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib"
  },
  "include": ["src"],
  "references": [{ "path": "../abc" }]
}`;

describe('Workspace', () => {
  describe('FromLocation()', () => {
    it('should return an instance', async () => {
      const path = join(tmpdir(), `testing-workspace-1a-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      expect(await workspace.GetName()).toBe('@org/xyz');
      expect(await workspace.GetVersion()).toBe('0.0.1');
      expect(await workspace.GetLocation()).toBe('xyz');
      expect(await workspace.GetDependencies()).toEqual({ '@org/abc': '^0.0.1', 'some-dependency': '^5.0.5' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/abc': '^0.0.1' });
    });

    it('should return the same instance as the project has', async () => {
      const path = join(tmpdir(), `testing-workspace-1b-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');

      expect(await project.GetWorkspace('@org/abc')).toBe(workspace);
    });
  });

  describe('Rename()', () => {
    it('should update the name of the workspace', async () => {
      const path = join(tmpdir(), `testing-workspace-2-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.Rename('@org/zyx');

      expect(await workspace.GetName()).toBe('@org/zyx');
      expect(await workspace.GetLocation()).toBe('zyx');
      expect(await workspace.GetDependencies()).toEqual({ '@org/abc': '^0.0.1', 'some-dependency': '^5.0.5' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/abc': '^0.0.1' });
    });

    it('should update the name in dependent workspaces', async () => {
      const path = join(tmpdir(), `testing-workspace-3-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.Rename('@org/cba');

      expect(await workspace.GetName()).toBe('@org/cba');
      expect(await workspace.GetLocation()).toBe('cba');

      const dependentWorkspace = await Workspace.FromLocation(project, 'xyz');
      expect(await dependentWorkspace.GetDependencies()).toEqual({ '@org/cba': '^0.0.1', 'some-dependency': '^5.0.5' });
      expect(await dependentWorkspace.GetWorkspaceDependencies()).toEqual({ '@org/cba': '^0.0.1' });
    });

    it('should update the path in the root tsconfig', async () => {
      const path = join(tmpdir(), `testing-workspace-4-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.Rename('@org/cba');

      expect(await workspace.GetName()).toBe('@org/cba');
      expect(await workspace.GetLocation()).toBe('cba');

      const actual = JSON.parse((await readFile(join(path, 'tsconfig.json'))).toString());
      expect(actual.compilerOptions.paths).toEqual({ '@org/cba': ['cba/src'], '@org/xyz': ['xyz/src'] });
    });
  });

  describe('AddDependency()', () => {
    it('should add a non-workspace dependency', async () => {
      const path = join(tmpdir(), `testing-workspace-5-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.AddDependency('another-dependency', '3.0.3');

      expect(await workspace.GetDependencies()).toEqual({
        '@org/abc': '^0.0.1',
        'some-dependency': '^5.0.5',
        'another-dependency': '^3.0.3',
      });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/abc': '^0.0.1' });
    });

    it('should add a workspace dependency with no explicit version', async () => {
      const path = join(tmpdir(), `testing-workspace-6-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.AddDependency('@org/xyz');

      expect(await workspace.GetDependencies()).toEqual({ '@org/xyz': '^0.0.1' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/xyz': '^0.0.1' });

      const actual = JSON.parse((await readFile(join(path, 'abc', 'tsconfig.json'))).toString());
      expect(actual.references).toEqual([{ path: '../xyz' }]);
    });

    it('should add a workspace dependency with an explicit version', async () => {
      const path = join(tmpdir(), `testing-workspace-7-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.AddDependency('@org/xyz', '1.0.0');

      expect(await workspace.GetDependencies()).toEqual({ '@org/xyz': '^1.0.0' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/xyz': '^1.0.0' });

      const actual = JSON.parse((await readFile(join(path, 'abc', 'tsconfig.json'))).toString());
      expect(actual.references).toEqual([{ path: '../xyz' }]);
    });

    it('should error for a non-workspace dependency with no version', async () => {
      const path = join(tmpdir(), `testing-workspace-8-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      let actual;
      try {
        await workspace.AddDependency('another-dependency');
      } catch (error) {
        actual = error;
      }

      expect(actual.message).toBe("A version parameter is required for non-workspace dependency 'another-dependency'");
    });
  });

  describe('RemoveDependency()', () => {
    it('should remove a non-workspace dependency', async () => {
      const path = join(tmpdir(), `testing-workspace-9-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.RemoveDependency('some-dependency');

      expect(await workspace.GetDependencies()).toEqual({ '@org/abc': '^0.0.1' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/abc': '^0.0.1' });
    });

    it('should remove a workspace dependency', async () => {
      const path = join(tmpdir(), `testing-workspace-10-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.RemoveDependency('@org/abc');

      expect(await workspace.GetDependencies()).toEqual({ 'some-dependency': '^5.0.5' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({});

      const actual = JSON.parse((await readFile(join(path, 'abc', 'tsconfig.json'))).toString());
      expect(actual.references).toEqual([]);
    });

    it('should ignore a non-workplace dependency that is not a dependency', async () => {
      const path = join(tmpdir(), `testing-workspace-11-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.RemoveDependency('another-dependency');

      expect(await workspace.GetDependencies()).toEqual({ '@org/abc': '^0.0.1', 'some-dependency': '^5.0.5' });
      expect(await workspace.GetWorkspaceDependencies()).toEqual({ '@org/abc': '^0.0.1' });
    });

    it('should ignore a workplace dependency that is not a dependency', async () => {
      const path = join(tmpdir(), `testing-workspace-12-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.RemoveDependency('@org/xyz');

      expect(await workspace.GetDependencies()).toEqual({});
      expect(await workspace.GetWorkspaceDependencies()).toEqual({});
    });
  });

  describe('IncrementPatchVersion()', () => {
    it('should increment the version of the package.json', async () => {
      const path = join(tmpdir(), `testing-workspace-13-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.IncrementPatchVersion();

      expect(await workspace.GetVersion()).toEqual('0.0.2');
    });

    it('should increment the version of dependent workspaces', async () => {
      const path = join(tmpdir(), `testing-workspace-14-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.IncrementPatchVersion();

      expect(await workspace.GetVersion()).toEqual('0.0.2');

      const actual = JSON.parse((await readFile(join(path, 'xyz', 'package.json'))).toString());
      expect(actual.dependencies['@org/abc']).toBe('^0.0.2');
    });
  });

  describe('IncrementMinorVersion()', () => {
    it('should increment the version of the package.json', async () => {
      const path = join(tmpdir(), `testing-workspace-15-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.IncrementMinorVersion();

      expect(await workspace.GetVersion()).toEqual('0.1.0');
    });

    it('should increment the version of dependent workspaces', async () => {
      const path = join(tmpdir(), `testing-workspace-16-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.IncrementMinorVersion();

      expect(await workspace.GetVersion()).toEqual('0.1.0');

      const actual = JSON.parse((await readFile(join(path, 'xyz', 'package.json'))).toString());
      expect(actual.dependencies['@org/abc']).toBe('^0.1.0');
    });
  });

  describe('IncrementMajorVersion()', () => {
    it('should increment the version of the package.json', async () => {
      const path = join(tmpdir(), `testing-workspace-17-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.IncrementMajorVersion();

      expect(await workspace.GetVersion()).toEqual('1.0.0');
    });

    it('should increment the version of dependent workspaces', async () => {
      const path = join(tmpdir(), `testing-workspace-18-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.IncrementMajorVersion();

      expect(await workspace.GetVersion()).toEqual('1.0.0');

      const actual = JSON.parse((await readFile(join(path, 'xyz', 'package.json'))).toString());
      expect(actual.dependencies['@org/abc']).toBe('^1.0.0');
    });
  });

  describe('Move()', () => {
    it('should move the workspace files', async () => {
      const path = join(tmpdir(), `testing-workspace-19-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.Move('core/abc');

      expect(await workspace.GetName()).toBe('@org/abc');
      expect(await workspace.GetLocation()).toBe('core/abc');
      expect(await isFile(join(path, 'core', 'abc', 'package.json'))).toBe(true);
      expect(await isFile(join(path, 'core', 'abc', 'tsconfig.json'))).toBe(true);
    });

    it('should update the paths in the root package.json and tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-workspace-20-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.Move('core/abc');

      const rootPackageJsonActual = await readFile(join(path, 'package.json'));
      const rootPackageJsonCompact = JSON.stringify(JSON.parse(rootPackageJsonActual.toString()));
      expect(rootPackageJsonCompact).toBe('{"private":true,"workspaces":["core/abc","xyz"]}');

      const rootTsconfigActual = await readFile(join(path, 'tsconfig.json'));
      const rootTsconfigCompact = JSON.stringify(JSON.parse(rootTsconfigActual.toString()));
      expect(rootTsconfigCompact.indexOf('"@org/abc":["core/abc/src"]')).toBeGreaterThan(0);
    });

    it('should update the paths of dependent workspaces', async () => {
      const path = join(tmpdir(), `testing-workspace-21-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'abc');
      await workspace.Move('core/abc');

      const xyzTsconfigActual = await readFile(join(path, 'xyz', 'tsconfig.json'));
      const xyzTsconfigCompact = JSON.parse(xyzTsconfigActual.toString());
      expect(xyzTsconfigCompact.references).toEqual([{ path: '../core/abc' }]);
    });

    it('should update the paths in the workspace tsconfig.json', async () => {
      const path = join(tmpdir(), `testing-workspace-22-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.Move('core/xyz');

      const xyzTsconfigActual = await readFile(join(path, 'core', 'xyz', 'tsconfig.json'));
      const xyzTsconfigCompact = JSON.parse(xyzTsconfigActual.toString());
      expect(xyzTsconfigCompact.extends).toBe('../../tsconfig.json');
      expect(xyzTsconfigCompact.references).toEqual([{ path: '../../abc' }]);
    });

    it('should do nothing if the new location is the current location', async () => {
      const path = join(tmpdir(), `testing-workspace-23-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');
      await workspace.Move('xyz');

      expect(await workspace.GetName()).toBe('@org/xyz');
      expect(await workspace.GetLocation()).toBe('xyz');
      expect(await isFile(join(path, 'xyz', 'package.json'))).toBe(true);
      expect(await isFile(join(path, 'xyz', 'tsconfig.json'))).toBe(true);
    });

    it('should error if the new location already exists', async () => {
      const path = join(tmpdir(), `testing-workspace-24-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
        writeFile(join(path, 'core', 'xyz', 'afile.txt'), 'here'),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      let actual;
      try {
        await workspace.Move('core/xyz');
      } catch (error) {
        actual = error;
      }

      expect(actual.message).toBe(`Directory already exists: ${join(path, 'core', 'xyz')}`);

      const rootPackageJsonActual = await readFile(join(path, 'package.json'));
      const rootPackageJsonCompact = JSON.stringify(JSON.parse(rootPackageJsonActual.toString()));
      expect(rootPackageJsonCompact).toBe('{"private":true,"workspaces":["abc","xyz"]}');

      const rootTsconfigActual = await readFile(join(path, 'tsconfig.json'));
      const rootTsconfigCompact = JSON.stringify(JSON.parse(rootTsconfigActual.toString()));
      expect(rootTsconfigCompact.indexOf('"@org/xyz":["xyz/src"]')).toBeGreaterThan(0);
    });
  });

  describe('Execute()', () => {
    it('should execute the cmd', async () => {
      const stdout = new Writable();
      let actual = '';
      stdout._write = (chunk, encoding, callback) => {
        actual += chunk.toString();
        callback();
      };

      const path = join(tmpdir(), `testing-workspace-25-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      const exitCode = await workspace.Execute('yarn', { args: ['--silent', 'run', 'hello'], stdout });
      expect(exitCode).toBe(0);
      expect(actual).toBe(
        '\n\u001b[34mWorkspace:\u001b[39m @org/xyz' +
          '\n\u001b[34mCommand:\u001b[39m   yarn --silent run hello\n\n  hello\n\n'
      );
    });

    it('should write to stderr', async () => {
      const stderr = new Writable();
      let actual = '';
      stderr._write = (chunk, encoding, callback) => {
        actual += chunk.toString();
        callback();
      };

      const path = join(tmpdir(), `testing-workspace-26-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      const exitCode = await workspace.Execute('yarn', { args: ['--silent', 'run', 'hello'], stderr });
      expect(exitCode).toBe(0);
      expect(actual).toBe('  warning package.json: No license field\n');
    });

    it('should return an exit code', async () => {
      const path = join(tmpdir(), `testing-workspace-27-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      const exitCode = await workspace.Execute('node', { args: ['-e', 'process.exit(5)'] });
      expect(exitCode).toBe(5);
    });

    it('should not require options', async () => {
      const path = join(tmpdir(), `testing-workspace-28-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      const exitCode = await workspace.Execute('ls');
      expect(exitCode).toBe(0);
    });

    it('should allow stderr and stdout to be the same stream', async () => {
      const stdout = new Writable();
      let actual = '';
      stdout._write = (chunk, encoding, callback) => {
        actual += chunk.toString();
        callback();
      };

      const path = join(tmpdir(), `testing-workspace-29-${Date.now()}`);
      await Promise.all([
        writeFile(join(path, 'package.json'), rootPackageJson),
        writeFile(join(path, 'tsconfig.json'), rootTsConfig),
        writeFile(join(path, 'abc', 'package.json'), abcPackageJson),
        writeFile(join(path, 'abc', 'tsconfig.json'), abcTsConfig),
        writeFile(join(path, 'xyz', 'package.json'), xyzPackageJson),
        writeFile(join(path, 'xyz', 'tsconfig.json'), xyzTsConfig),
      ]);

      const project = await Project.FromRootPath(path);
      const workspace = await Workspace.FromLocation(project, 'xyz');

      const exitCode = await workspace.Execute('yarn', { args: ['--silent', 'run', 'hello'], stdout, stderr: stdout });
      expect(exitCode).toBe(0);
      expect(actual).toBe(
        '\n\u001b[34mWorkspace:\u001b[39m @org/xyz' +
          '\n\u001b[34mCommand:\u001b[39m   yarn --silent run hello\n\n' +
          '  warning package.json: No license field\n' +
          '  hello\n\n'
      );
    });
  });
});
