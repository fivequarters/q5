import { Request, Response } from 'express';

export interface IFunctionSummary {
  [key: string]: string | number | null | boolean;
}

export interface IFunctionParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  [key: string]: any;
}

export type IFunctionPermission = string;

// Additions to the Request object added by function-api
export interface IFunctionApiRequest extends Request {
  params: IFunctionParams;
  resolvedAgent: any;
  functionSummary: IFunctionSummary;
}
