/// <reference types="node" />
import { NextFunction, Request, Response } from 'express';
import { IRegistryConfig, IRegistryStore } from './Registry';
declare type ExpressHandler = (reqExpress: Request, res: Response, next: NextFunction) => any;
declare class MemRegistry implements IRegistryStore {
    static handler(): {
        registry: MemRegistry;
        handler: ExpressHandler;
    };
    registry: {
        [key: string]: any;
    };
    config: IRegistryConfig;
    private readonly initialRegistry;
    private readonly initialConfig;
    constructor();
    name(): string;
    put(key: string, pkg: any, ver?: string, payload?: any): Promise<void>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<any>;
    semverGet(key: string, filter: string): Promise<string | null>;
    tarballGet(id: any): Promise<Buffer>;
    tarballDelete(nameVer: string): Promise<any>;
    search(keyword: string, count: number, next?: string): Promise<any>;
    configPut(config: IRegistryConfig): Promise<void>;
    configGet(): Promise<IRegistryConfig>;
    configDelete(): Promise<void>;
    configInternalGet(): Promise<any>;
}
export { MemRegistry };
//# sourceMappingURL=MemRegistry.d.ts.map