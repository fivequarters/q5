import { Express, NextFunction, Request, Response } from 'express';
import { IRegistryStore } from './Registry';

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
  constructor() {
    this.registry = { pkg: {}, tgz: {} };
  }

  public async put(key: string, pkg: any, payload: any): Promise<void> {
    this.registry.pkg[key] = pkg;
    this.registry.tgz[key] = payload;
  }

  public async get(key: any): Promise<any> {
    return this.registry.pkg[key];
  }

  public async tarball(key: any): Promise<Buffer> {
    return this.registry.tgz[key];
  }

  public async search(keywords: string[]): Promise<any> {
    return {};
  }
}

export { MemRegistry };
