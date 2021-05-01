import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

export default {
  getAll: async () => {},
  searchByTag: async (tagKey: string, tagValue: string) => {},
  createNew: async (data: object) => {},
  getById: async (componentId: string) => {},
  getInstance: async (componentId: string) => {},
  updateInstance: async (componentId: string, data: object) => {},
  deleteInstance: async (componentId: string) => {},
  applyTagToInstance: async (componentId: string, tagKey: string, tagValue: string) => {},
  getInstanceTagValues: async (componentId: string, tagKey: string) => {},
  getInstanceTags: async (componentId: string) => {},
  removeTagFromInstance: async (componentId: string, tagKey: string) => {},
  health: async (componentId: string) => {},
  dispatch: (req: Request, res: Response, next: NextFunction) => {
    // execute the functionExecuteHandler array in some form by passing it directly to the router object? Except
    // that's not quite right because pieces have already been extracted ...
    // Load metadata for the components requested
    // Perform any security checks necessary
    // Convert req into a Koa request-compatible data object
    // Dispatch to lambda to be routed internal to the function
    // Return result via res.
    next(create_error(418));
  },
};
