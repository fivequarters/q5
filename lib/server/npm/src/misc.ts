import { Request, Response } from 'express';

import httpError from 'http-errors';

interface IFunctionApiRequest extends Request {
  resolvedAgent: string;
}

const versionGet = () => {
  return async (req: Request, res: Response, next: any) => {
    return res.status(200).json({ version: process.env.FUNCTION_API_VERSION });
  };
};

const pingGet = () => {
  return async (req: Request, res: Response, next: any) => {
    return res.status(200).json({});
  };
};

const loginPut = () => {
  return async (req: Request, res: Response, next: any) => {
    // In theory it's already been authorized by the time it gets here, so always approve.
    return res.status(201).json({ token: req.body });
  };
};

const whoamiGet = () => {
  return async (req: Request, res: Response, next: any) => {
    return res.status(200).json({ username: (req as IFunctionApiRequest).resolvedAgent });
  };
};

const auditPost = () => {
  return async (req: Request, res: Response, next: any) => {
    return next(httpError(501, `unsupported`));
  };
};

export { versionGet, pingGet, loginPut, whoamiGet, auditPost };
