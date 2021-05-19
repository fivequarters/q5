import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Get a specific tag for the current entity
const get = (req: Request, res: Response, next: NextFunction) => {
  next(create_error(418));
};

// Get all the tags for the current entity
const getAll = (req: Request, res: Response, next: NextFunction) => {
  next(create_error(418));
};

// Remove a tag from the current entity
const remove = (req: Request, res: Response, next: NextFunction) => {
  // Update the datatstore, removing one tag from the instance - filter based on reserved keywords.
  next(create_error(418));
};

// Set the value of a tag for the current entity
const put = (req: Request, res: Response, next: NextFunction) => {
  next(create_error(418));
};

// Search for an entity, optionally filtered by tags
const search = (req: Request, res: Response, next: NextFunction) => {
  next(create_error(418));
};

export { get, getAll, remove, put, search };
