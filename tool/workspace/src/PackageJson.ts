import JsonFile from './JsonFile';

const versionRegex = /^(\d+).(\d+).(\d+)$/;

function parseVersion(version = '0.0.0') {
  const match = version.match(versionRegex);
  if (!match) {
    throw new Error(`Unable to parse the version value '${version}'`);
  }
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);
  return { major, minor, patch };
}

function stringifyVersion(version: { major: number; minor: number; patch: number }): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export default class PackageJson extends JsonFile {
  constructor(path: string) {
    super(path);
  }

  public async GetName(): Promise<string> {
    await super.Load();
    return this.contents.name;
  }

  public async Rename(name: string): Promise<void> {
    await super.Load();
    this.contents.name = name;
    await super.Save();
  }

  public async GetVersion(): Promise<string> {
    await super.Load();
    return this.contents.version;
  }

  public async GetDevServerPort(): Promise<number> {
    await super.Load();
    let port = -1;
    const devServer = this.contents.devServer;
    if (devServer) {
      port = devServer.port;
    }

    return port;
  }

  public async SetDevServerPort(port: number): Promise<void> {
    await super.Load();
    this.contents.devServer = this.contents.devServer || {};
    this.contents.devServer.port = port;
    await super.Save();
  }

  public async IncrementPatchVersion(): Promise<void> {
    await super.Load();
    const version = parseVersion(this.contents.version);
    version.patch++;
    this.contents.version = stringifyVersion(version);
    await super.Save();
  }

  public async IncrementMinorVersion(): Promise<void> {
    await super.Load();
    const version = parseVersion(this.contents.version);
    version.minor++;
    version.patch = 0;
    this.contents.version = stringifyVersion(version);
    await super.Save();
  }

  public async IncrementMajorVersion(): Promise<void> {
    await super.Load();
    const version = parseVersion(this.contents.version);
    version.major++;
    version.minor = 0;
    version.patch = 0;
    this.contents.version = stringifyVersion(version);
    await super.Save();
  }

  public async HasScript(script: string): Promise<boolean> {
    await super.Load();
    const scripts = this.contents.scripts;
    return scripts && scripts[script];
  }

  public async GetDependencies(): Promise<any> {
    await super.Load();
    const dependencies: any = {};
    for (const name of Object.keys(this.contents.dependencies || {})) {
      dependencies[name] = this.contents.dependencies[name];
    }
    return dependencies;
  }

  public async SetDependency(name: string, version: string, isDev: boolean = false): Promise<void> {
    await super.Load();
    const dependencies = (isDev ? this.contents.devDependencies : this.contents.dependencies) || {};
    dependencies[name] = version;
    if (isDev) {
      this.contents.devDependencies = dependencies;
    } else {
      this.contents.dependencies = dependencies;
    }
    await super.Save();
  }

  public async RemoveDependency(name: string): Promise<void> {
    await super.Load();
    const dependencies = this.contents.dependencies || {};
    dependencies[name] = undefined;
    await super.Save();
  }

  public async UpdateDependency(name: string, newName: string, version?: string): Promise<void> {
    await super.Load();
    const dependencies = this.contents.dependencies || {};
    if (dependencies[name]) {
      version = version || dependencies[name];
      dependencies[name] = undefined;
      dependencies[newName] = version;
      this.contents.dependencies = dependencies;
      await super.Save();
    }
  }
}
