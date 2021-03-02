/// <reference types="qs" />
import { Response, Request } from 'express';
declare const revisionDelete: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
declare const revisionPut: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
export { revisionDelete, revisionPut };
//# sourceMappingURL=revision.d.ts.map