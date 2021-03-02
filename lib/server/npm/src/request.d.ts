import { Request } from 'express';
import { IRegistryStore } from '@5qtrs/registry';
export interface IFunctionApiRequest extends Request {
    resolvedAgent: string;
    registry: IRegistryStore;
    tarballRootUrl?: string;
}
//# sourceMappingURL=request.d.ts.map