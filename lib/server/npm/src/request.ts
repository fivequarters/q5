import { Request, Response } from 'express';

import { IRegistryStore } from '@5qtrs/registry';

// Additions to the Request object added by function-api
export interface IFunctionApiRequest extends Request {
  resolvedAgent: string;
  registry: IRegistryStore;
}
