import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Create a new object of this type.
const post = (req: Request, res: Response, next: NextFunction) => {
  // If this is a integration:
  //  Expect the body to be effectively identical to a Fusebit function spec for now.
  //  Discard the contents of any index.js, replace with module.exports = require('@fusebit-int/pkg-handler');
  // If this is a connector:
  //  Expect only configuration information:
  //    { package: string, config: any, function?: FusebitFunctionSpec }
  //  Validate package is in the package.json, or referenced in `packages` to enable link.
  //
  //  Write function with config in expected location and a populated package.json

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
  // execute the functionExecuteHandler array in some form by passing it directly to the router object? Except
  // that's not quite right because pieces have already been extracted ...
  // Load metadata for the component requested
  // Perform any security checks necessary
  // Convert req into a Koa request-compatible data object
  // Dispatch to lambda to be routed internal to the function
  // Return result via res.
  next(create_error(418));
};

export { post, put, remove, patch, dispatch };
