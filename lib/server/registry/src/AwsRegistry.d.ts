import { IRegistryConfig, IRegistryGlobalConfig, IRegistryInternalConfig, IRegistryParams, IRegistryStore, IRegistryEventHandlers } from './Registry';
declare type ExpressHandler = (reqExpress: Request, res: Response, next: any) => any;
declare class AwsRegistry implements IRegistryStore {
    static handler(eventHandlers: IRegistryEventHandlers): ExpressHandler;
    static create(params: IRegistryParams, eventHandlers?: IRegistryEventHandlers, s3Opts?: any, dynamoDbOpts?: any): IRegistryStore;
    private keyPrefix;
    private eventHandlers;
    private s3;
    private ddb;
    private tableName;
    constructor(prefix: string, eventHandlers?: IRegistryEventHandlers, s3Opts?: any, dynamoDbOpts?: any);
    name(): string;
    put(name: string, pkg: any, ver: string, payload?: any): Promise<void>;
    findScope(cfg: IRegistryInternalConfig, name: string): AwsRegistry;
    get(name: string): Promise<any>;
    internalGet(name: string): Promise<any>;
    delete(name: string): Promise<any>;
    tarballGet(nameVer: string): Promise<any>;
    tarballDelete(nameVer: string): Promise<any>;
    internalTarball(nameVer: any): Promise<string>;
    semverGet(name: string, filter: string): Promise<string | null>;
    search(keyword: string, count?: number, next?: string): Promise<any>;
    internalSearch(keyword: string, count?: number, next?: string): Promise<any>;
    configPut(config: IRegistryConfig): Promise<void>;
    configDelete(): Promise<void>;
    configGet(): Promise<IRegistryConfig>;
    internalConfigGet(): Promise<IRegistryInternalConfig>;
    refreshGlobal(): Promise<void>;
    globalConfigPut(global: IRegistryGlobalConfig): Promise<void>;
    globalConfigGet(): Promise<IRegistryGlobalConfig | undefined>;
    globalConfigUpdate(global: IRegistryGlobalConfig): Promise<void>;
    private getS3Path;
    private getDynamoKey;
}
export { AwsRegistry };
//# sourceMappingURL=AwsRegistry.d.ts.map