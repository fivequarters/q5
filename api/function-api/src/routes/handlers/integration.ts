import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Get an integration description
const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Create a new integration with associated artifacts
const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Update an integration
const put = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Delete an integration
const remove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Get the configuration of an integration instance
const instanceGet = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Create a new integration instance
const instancePost = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Update an integration instance
const instancePut = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Patch an integration instance
const instancePatch = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Delete an integration instance
const instanceRemove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const instance = {
  get: instanceGet,
  post: instancePost,
  put: instancePut,
  patch: instancePatch,
  remove: instanceRemove,
};

export { get, post, remove, put, instance };
