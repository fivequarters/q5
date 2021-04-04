import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Get the connector definition
const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Create a new connector and associated artifacts
const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Update a connector definition
const put = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Delete a connector and associated artifacts
const remove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Get the details for an identity
const identityGet = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Create a new identity
const identityPost = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Patch an identity
const identityPatch = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Delete an identity
const identityRemove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const identity = {
  get: identityGet,
  post: identityPost,
  patch: identityPatch,
  remove: identityRemove,
};

export { get, post, put, remove, identity };
