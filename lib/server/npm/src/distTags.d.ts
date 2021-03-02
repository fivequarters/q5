/// <reference types="qs" />
import { Response, Request, NextFunction } from 'express';
declare const distTagsGet: () => (reqGeneral: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: NextFunction) => void;
declare const distTagsPut: () => (reqGeneral: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: NextFunction) => void;
declare const distTagsDelete: () => (reqGeneral: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: NextFunction) => void;
export { distTagsGet, distTagsPut, distTagsDelete };
//# sourceMappingURL=distTags.d.ts.map