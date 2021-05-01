import { NextFunction, Request, Response } from 'express';
import Tag from '../../types/Tag';
import Component from '../../types/Component';
import BaseDao from '../BaseDao';
import Converter from '../../types/Converter';

export default abstract class ComponentDao<T extends Component> extends BaseDao {
  protected abstract readonly converter: Converter<T>;
  protected abstract readonly tableName: string;

  // Full implementation should go here for all shared functionality between components
  //
  // Any values that need be differentiated between different implementations of this abstract class
  // should be defined in the same way `converter` and `tableName` are above, and then assigned in the
  // extending class
  getAll: () => Promise<T[]> = async () => {
    // Example psuedo code to demonstrate how to access the DynamoDb sdk and how to utilize the converter
    const queryOutput = await this.DynamoDb.query().promise();
    return this.converter.fromDynamoQuery(queryOutput);
  };
  // Stubbed methods below have ! added so that typescript doesn't complain about undefined implementations.
  // Once the implementation is added and they are no longer stubs, the ! should be removed.
  searchByTag!: (tagKey: string, tagValue: string) => Promise<T[]>;
  createNew!: (data: object) => Promise<T>;
  get!: (componentId: string) => Promise<T>;
  update!: (componentId: string, data: object) => Promise<T>;
  delete!: (componentId: string) => Promise<boolean>;
  applyTag!: (componentId: string, tagKey: string, tagValue: string) => Promise<T>;
  getTagValues!: (componentId: string, tagKey: string) => Promise<T>;
  getTags!: (componentId: string) => Promise<Tag[]>;
  removeTag!: (componentId: string, tagKey: string) => Promise<T>;
  health!: (componentId: string) => Promise<boolean>;
  dispatch!: (req: Request, res: Response, next: NextFunction) => Promise<any>;
  //{
  // execute the functionExecuteHandler array in some form by passing it directly to the router object? Except
  // that's not quite right because pieces have already been extracted ...
  // Load metadata for the components requested
  // Perform any security checks necessary
  // Convert req into a Koa request-compatible data object
  // Dispatch to lambda to be routed internal to the function
  // Return result via res.
  //  next(create_error(418));
  //};
}
