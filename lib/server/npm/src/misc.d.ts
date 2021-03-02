/// <reference types="qs" />
import { Request, Response } from 'express';
declare const versionGet: () => (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Response<any>;
declare const pingGet: () => (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Response<any>;
declare const loginPut: () => (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Response<any>;
declare const whoamiGet: () => (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => Response<any>;
declare const auditPost: () => (req: Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs>, res: Response<any>, next: any) => any;
export { versionGet, pingGet, loginPut, whoamiGet, auditPost };
//# sourceMappingURL=misc.d.ts.map