import { maxSatisfying } from 'semver';

import { Express, NextFunction, Request, Response } from 'express';
import { IRegistryConfig, IRegistryStore } from './Registry';

import { duplicate } from '@5qtrs/constants';

type ExpressHandler = (reqExpress: Request, res: Response, next: NextFunction) => any;

class MemRegistry implements IRegistryStore {
  public static handler(): { registry: MemRegistry; handler: ExpressHandler } {
    const registry = new MemRegistry();
    return {
      registry,
      handler: (reqExpress: Request, res: Response, next: any) => {
        const req: any = reqExpress;
        req.registry = registry;
        return next();
      },
    };
  }

  public registry: { [key: string]: any };
  public config: IRegistryConfig;
  constructor() {
    this.registry = { pkg: {}, tgz: {} };
    this.config = { url: '', scopes: [] };
  }

  public name() {
    return 'mem';
  }

  public async put(key: string, pkg: any, ver?: string, payload?: any): Promise<void> {
    this.registry.pkg[key] = duplicate({}, pkg);
    if (payload) {
      this.registry.tgz[`${key}@${ver}`] = payload;
    }
  }

  public async get(key: string): Promise<any> {
    // Prevent accidental modification of the in-memory object.
    return duplicate({}, this.registry.pkg[key] || {});
  }

  public async delete(key: string): Promise<any> {
    delete this.registry.pkg[key];
    delete this.registry.tgz[key];
  }

  public async semverGet(key: string, filter: string): Promise<string | null> {
    const pkg = await this.get(key);
    return maxSatisfying(Object.keys(pkg.versions), filter);
  }

  public async tarballGet(id: any): Promise<Buffer> {
    return this.registry.tgz[id];
  }

  public async tarballDelete(nameVer: string): Promise<any> {
    // Remove the tarball specified by ver.
  }

  public async search(keyword: string, count: number, next?: string): Promise<any> {
    const objects = Object.keys(this.registry.pkg)
      .filter((p: any) => p.indexOf(keyword) >= 0)
      .map((name: any) => ({ package: duplicate({}, this.registry.pkg[name]) }));
    const total = objects.length;
    const time = new Date().toUTCString();

    return { objects, total, time };
  }

  public async configPut(config: IRegistryConfig): Promise<void> {
    this.config = config;
  }

  public async configGet(): Promise<IRegistryConfig> {
    return this.config;
  }

  public async configInternalGet(): Promise<any> {
    return this.config;
  }
}

export { MemRegistry };
