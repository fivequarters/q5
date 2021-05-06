import * as Model from './model';
import { EntityType, getEntity, createEntity, deleteEntity } from './entity';

//--------------------------------
// Operation
//--------------------------------

const defaultOperationExpiry = 10 * 60 * 1000;

function entityToOperation(entity: Model.IEntity): Model.IOperation {
  return {
    accountId: entity.accountId,
    subscriptionId: entity.subscriptionId,
    id: entity.id,
    data: entity.data,
    expires: entity.expires,
  };
}

/**
 * Returns an async operation description.
 * Throws NotFoundError if the operation is not found.
 * @param params Primary key.
 * @returns Async operation description or undefined if the async operation does not exist or expired.
 */
export async function getOperation(params: Model.IEntityKey): Promise<Model.IOperation> {
  return entityToOperation(await getEntity({ entityType: EntityType.Operation, filterExpired: true }, params));
}

/**
 * Ensures an async operation is deleted.
 * @param params Primary key.
 * @param options SQL options.
 * @returns True if the operation was deleted or false if it did not exist.
 */
export async function deleteOperation(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<boolean> {
  return deleteEntity({ entityType: EntityType.Operation }, params, options);
}

/**
 * Upserts an async operation and extends its TTL to the expiry time specified in params.expires or 10 minutes if
 * not specified.
 * @param params Async operation
 * @param options SQL options.
 * @returns Inserted async operation.
 */
export async function putOperation(
  params: Model.IOperation,
  options?: Model.IStatementOptions
): Promise<Model.IOperation> {
  return entityToOperation(
    await createEntity(
      { entityType: EntityType.Operation, upsert: true },
      { expires: Date.now() + defaultOperationExpiry, ...params, version: undefined, tags: {} },
      options
    )
  ) as Model.IOperation;
}
