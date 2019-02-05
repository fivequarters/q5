import { readFile, writeFile } from '@5qtrs/file';
import { tmpdir } from 'os';
import { join } from 'path';
import { PackageJson } from '../src/index';

const abcPackageJson = `{
  "name": "@org/abc",
  "version": "0.0.1",
  "dependencies": {
    "@org/xyz": "^0.0.1",
    "@org/pqr": "^0.0.1"
  }
}`;

const abcPackageJsonNoVersion = `{
  "name": "@org/abc",
  "dependencies": {
    "@org/xyz": "^0.0.1",
    "@org/pqr": "^0.0.1"
  }
}`;

const abcPackageJsonInvalid = `{
  "name": "@org/abc",
  "version": "0.1",
  "dependencies": {
    "@org/xyz": "^0.0.1",
    "@org/pqr": "^0.0.1"
  }
}`;

const abcPackageJsonNoDependencies = `{
  "name": "@org/abc",
  "version": "0.0.1"
}`;

describe('PackageJson', () => {
  describe('constructor()', () => {
    it('should return an instance with properties set', async () => {
      const path = join(tmpdir(), `testing-packageJson-1-${Date.now()}`, 'package.json');
      const packageJson = new PackageJson(path);
      expect(packageJson.Path).toBe(path);
    });
  });
  describe('GetName()', () => {
    it('should return the name from the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-2-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      expect(await packageJson.GetName()).toBe('@org/abc');
    });
  });
  describe('Rename()', () => {
    it('should set the name in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-3-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.Rename('@org/abc-core');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.name).toBe('@org/abc-core');
      expect(await packageJson.GetName()).toBe('@org/abc-core');
    });
  });
  describe('GetVersion()', () => {
    it('should return the version from the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-4-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      expect(await packageJson.GetVersion()).toBe('0.0.1');
    });
  });
  describe('IncrementPatchVersion()', () => {
    it('should increment the patch version in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-5a-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.IncrementPatchVersion();
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.version).toBe('0.0.2');
      expect(await packageJson.GetVersion()).toBe('0.0.2');
    });
    it('should increment the patch even if no version is in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-5b-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonNoVersion);
      const packageJson = new PackageJson(path);
      await packageJson.IncrementPatchVersion();
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.version).toBe('0.0.1');
      expect(await packageJson.GetVersion()).toBe('0.0.1');
    });
    it('should error if the version in the package.json is invalid', async () => {
      const path = join(tmpdir(), `testing-packageJson-5c-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonInvalid);
      const packageJson = new PackageJson(path);
      let actual;
      try {
        await packageJson.IncrementPatchVersion();
      } catch (error) {
        actual = error;
      }
      expect(actual.message).toBe("Unable to parse the version value '0.1'");
    });
  });
  describe('IncrementMinorVersion()', () => {
    it('should increment the minor version in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-6-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.IncrementMinorVersion();
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.version).toBe('0.1.0');
      expect(await packageJson.GetVersion()).toBe('0.1.0');
    });
  });
  describe('IncrementMajorVersion()', () => {
    it('should increment the major version in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-7-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.IncrementMajorVersion();
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.version).toBe('1.0.0');
      expect(await packageJson.GetVersion()).toBe('1.0.0');
    });
  });
  describe('GetDependencies()', () => {
    it('should return the dependencies from the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-8a-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.1' });
    });
    it('should return an empty object if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-8b-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonNoDependencies);
      const packageJson = new PackageJson(path);
      expect(await packageJson.GetDependencies()).toEqual({});
    });
  });
  describe('SetDependency()', () => {
    it('should add a dependency to the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-9-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.SetDependency('@org/rst', '^0.0.5');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies['@org/rst']).toBe('^0.0.5');
      expect(await packageJson.GetDependencies()).toEqual({
        '@org/pqr': '^0.0.1',
        '@org/xyz': '^0.0.1',
        '@org/rst': '^0.0.5',
      });
    });
    it('should add a dev dependency to the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-9a-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.SetDependency('@org/rst', '^0.0.5', true);
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.devDependencies['@org/rst']).toBe('^0.0.5');
    });
    it('should add a dependency if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-10-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonNoDependencies);
      const packageJson = new PackageJson(path);
      await packageJson.SetDependency('@org/xyz', '^0.0.3');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies['@org/xyz']).toBe('^0.0.3');
      expect(await packageJson.GetDependencies()).toEqual({ '@org/xyz': '^0.0.3' });
    });
    it('should update a dependency in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-11-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.SetDependency('@org/xyz', '^0.0.3');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies['@org/xyz']).toBe('^0.0.3');
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.3' });
    });
  });
  describe('RemoveDependency()', () => {
    it('should remove a dependency from the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-12-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.RemoveDependency('@org/xyz');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual({ '@org/pqr': '^0.0.1' });
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1' });
    });
    it('should do nothing if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-13-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonNoDependencies);
      const packageJson = new PackageJson(path);
      await packageJson.RemoveDependency('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual(undefined);
      expect(await packageJson.GetDependencies()).toEqual({});
    });
    it('should ignore a dependency that is not in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-14-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.RemoveDependency('@org/rst');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.1' });
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.1' });
    });
  });
  describe('UpdateDependency()', () => {
    it('should update a dependency in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-15-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.UpdateDependency('@org/xyz', '@org/zyx', '^0.0.5');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual({ '@org/pqr': '^0.0.1', '@org/zyx': '^0.0.5' });
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/zyx': '^0.0.5' });
    });
    it('should update a dependency and use the version in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-16-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.UpdateDependency('@org/xyz', '@org/zyx');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual({ '@org/pqr': '^0.0.1', '@org/zyx': '^0.0.1' });
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/zyx': '^0.0.1' });
    });
    it('should do nothing if no dependencies in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-17-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJsonNoDependencies);
      const packageJson = new PackageJson(path);
      await packageJson.UpdateDependency('@org/xyz', '@org/zyx', '^0.0.5');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual(undefined);
      expect(await packageJson.GetDependencies()).toEqual({});
    });
    it('should ignore a dependency that is not in the package.json', async () => {
      const path = join(tmpdir(), `testing-packageJson-18-${Date.now()}`, 'package.json');
      await writeFile(path, abcPackageJson);
      const packageJson = new PackageJson(path);
      await packageJson.UpdateDependency('@org/rst', '@org/tsr', '^0.0.5');
      const actual = JSON.parse((await readFile(path)).toString());
      expect(actual.dependencies).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.1' });
      expect(await packageJson.GetDependencies()).toEqual({ '@org/pqr': '^0.0.1', '@org/xyz': '^0.0.1' });
    });
  });
});
