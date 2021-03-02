/// <reference types="qs" />
import { Response, Request } from 'express';
declare const tarballGet: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
declare const tarballDelete: () => (reqGeneric: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Promise<any>;
export { tarballGet, tarballDelete };
//# sourceMappingURL=tarball.d.ts.map