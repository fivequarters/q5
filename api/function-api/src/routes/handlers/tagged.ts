import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Get a specific tag for the current entity
const getTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Get all the tags for the current entity
const getAllTags = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Remove a tag from the current entity
const deleteTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Set the value of a tag for the current entity
const setTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Search for an entity, optionally filtered by tags
const search = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

export { getTag, getAllTags, deleteTag, setTag, search };
