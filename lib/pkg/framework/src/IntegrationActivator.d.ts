import { Context, IInstanceConnectorConfig } from './';
export default abstract class IntegrationActivator<T> {
    protected abstract instantiate(ctx: Context, lookupKey: string): Promise<T>;
    config: IInstanceConnectorConfig;
    constructor(cfg: IInstanceConnectorConfig);
    /**
     * Request an access token to communicate with specified connector.
     * @returns Promise<string>
     */
    protected requestConnectorToken({ ctx, lookupKey }: {
        ctx: Context;
        lookupKey: string;
    }): Promise<string>;
}
//# sourceMappingURL=IntegrationActivator.d.ts.map