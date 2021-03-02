/// <reference types="qs" />
import { NextFunction, Response, Request } from 'express';
import { tarballUrlUpdate } from './tarballUrlUpdate';
declare const packagePut: () => (req: Request, res: Response, next: NextFunction) => void;
declare const packageGet: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
declare const packageDelete: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
export { packagePut, packageGet, packageDelete, tarballUrlUpdate };
//# sourceMappingURL=package.d.ts.map