import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Create a new object of this type.
const post = (req: Request, res: Response, next: NextFunction) => {
  // Process incoming message
  // Create function specification using appropriate dependencies
  //
  //   Note: Perform a pseudo-link where the files and package.json specified in the post are layed in the
  //   function specification in the node_modules directory, with the dependencies promoted. The database
  //   contents then become the file contents specified in the post.
  //
  //   The pkg-${componentType} version in the post contents is promoted as well.
  //
  //   The top level index.js and package.json should be a straight dispatch to
  //   pkg-${componentType}.entrypoint, likely a single line worth of js.
  //
  // Create new function
  // Return async operation url for status
  next(create_error(418));
};

// Update an existing object
const put = (req: Request, res: Response, next: NextFunction) => {
  // Process incoming message
  // Create function specification using appropriate dependencies
  //
  //   Note: Expect to fully regenerate the top-level package.json.  No reason not to.
  //
  // Update existing function
  // Return async operation url for status
  next(create_error(418));
};

// Remove an object of this type.
const remove = (req: Request, res: Response, next: NextFunction) => {
  // Load the specification for the selected instance
  // Remove the artifacts
  // Return async operation url for status
  next(create_error(418));
};

// Patch an object of this type.
const patch = (req: Request, res: Response, next: NextFunction) => {
  // Effectively identical to put, except implies a merge operation up front.
  next(create_error(418));
};

const dispatch = (req: Request, res: Response, next: NextFunction) => {
  // Load metadata for the component requested
  // Perform any security checks necessary
  // Convert req into a Koa request-compatible data object
  // Dispatch to lambda to be routed internal to the function
  // Return result via res.
  next(create_error(418));
};

export { post, put, remove, patch, dispatch };
