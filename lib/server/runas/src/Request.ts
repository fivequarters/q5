import { Request } from 'express';

export interface IFunctionPermission {
  action: string;
  resource: string;
}

export interface IFunctionPermissions {
  allow: IFunctionPermission[];
}

export type IAuthentication = 'none' | 'optional' | 'required';

export interface ISecurity {
  authentication?: IAuthentication;
  authorization?: IFunctionPermission[];
  functionPermissions?: IFunctionPermissions;
}

export interface ITaskConfiguration {
  maxPending?: number;
  maxRunning?: number;
  queue: { url: string };
}

export interface IRoute {
  path: string;
  security?: ISecurity;
  task?: ITaskConfiguration;
}

export interface IFunctionSummary {
  routes?: IRoute[];
  'security.authentication'?: IAuthentication;
  'security.authorization'?: IFunctionPermission[];
  'security.permissions'?: IFunctionPermissions;
  [key: string]:
    | string
    | number
    | null
    | boolean
    | IRoute[]
    | IFunctionPermission[]
    | IFunctionPermissions
    | IAuthentication
    | undefined;
}

export interface IFunctionParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  baseUrl: string;
  functionPath: string;
  matchingRoute?: IRoute;
  [key: string]: any;
}

// Additions to the Request object added by function-api
export interface IFunctionApiRequest extends Request {
  params: IFunctionParams;
  subscription: any;
  resolvedAgent: any;
  functionSummary: IFunctionSummary;
}

export const requireRunAsRequest = (req: Request | IFunctionApiRequest): asserts req is IFunctionApiRequest => {
  if ((req as IFunctionApiRequest).subscription === undefined) {
    throw new Error(`Invalid Request Object: missing 'subscription'`);
  }
};
