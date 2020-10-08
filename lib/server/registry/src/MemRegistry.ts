import { Express, NextFunction, Request, Response } from 'express';
import { IRegistryConfig, IRegistryStore } from './Registry';

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

  public async search(keyword: string, count: number, next?: string): Promise<any> {
    return {};
  }
  public async configPut(config: IRegistryConfig): Promise<void> {
    this.config = config;
  }

  public async configGet(): Promise<IRegistryConfig> {
    return this.config;
  }
}

export { MemRegistry };
