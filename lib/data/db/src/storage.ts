import * as Model from './model';
import {
  EntityType,
  getEntity,
  createEntity,
  deleteEntity,
  listEntities,
  setEntityTag,
  getEntityTags,
  updateEntityTags,
} from './entity';

//--------------------------------
// Storage
//--------------------------------

/**
 * Gets a storage item.
 * @param params Primary keys.
 * @returns Storage item undefined if no matching storage item found.
 */
export async function getStorage(params: Model.IEntityKey): Promise<Model.IStorageItem | undefined> {
  return (await getEntity({ entityType: EntityType.Storage }, params)) as Model.IStorageItem;
}

/**
 * Ensures the storage or storage hierarchy is deleted. If recursive is true, deletes all storage items that have
 * an id prefix-matching params.id. If recursive is false, only removes a storage item with the exact id.
 * @param params Primary keys.
 * @param recursive Controls if the delete applies to an entire hierarchy.
 * @param options SQL options.
 * @returns Returns true if the at least one storage item was removed and false if none were deleted.
 */
export async function deleteStorage(
  params: Model.IEntityKey,
  recursive?: boolean,
  options?: Model.IStatementOptions
): Promise<boolean> {
  return await deleteEntity({ entityType: EntityType.Storage, prefixMatchId: !!recursive }, params, options);
}

/**
 * Upserts storage item. If you want conflict detection, do specify params.version which must match
 * the current version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure params.version is undefined.
 * @param params Storage item.
 * @param options SQL options.
 * @returns Upserted storage item or undefined in case the storage item was modified since last read.
 */
export async function putStorage(
  params: Model.IStorageItem,
  options?: Model.IStatementOptions
): Promise<Model.IStorageItem | undefined> {
  return (await createEntity({ entityType: EntityType.Storage, upsert: true }, params, options)) as Model.IStorageItem;
}

/**
 * Lists storage items matching search criteria, with paging support. Returns up to 100 records at a time.
 * @param params Search and continuation criteria
 * @returns List of storage items and the `next` continuation token if there is more data to get.
 */
export async function listStorage(params: Model.IListRequest): Promise<Model.IListResponse> {
  return await listEntities({ entityType: EntityType.Storage, filterExpired: true }, params);
}

/**
 * Gets storage item tags.
 * @param params Primary keys.
 * @returns Storage item tags and version or undefined if no matching storage item found.
 */
export async function getStorageTags(params: Model.IEntityKey): Promise<Model.ITagsWithVersion | undefined> {
  return await getEntityTags({ entityType: EntityType.Storage, filterExpired: true }, params);
}

/**
 * Updates tags of an existing storage item. If you want conflict detection, do specify tags.version which must match
 * the current storage item version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure tags.version is undefined.
 * @param params Primary keys.
 * @param tags New storage item tags and expected version.
 * @param options SQL options.
 * @returns Updated storage item tags and version or undefined in case the storage item was deleted, expired, or modified since last read.
 */
export async function setStorageTags(
  params: Model.IEntityKey,
  tags: Model.ITagsWithVersion,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await updateEntityTags({ entityType: EntityType.Storage, filterExpired: true }, params, tags, options);
}

/**
 * Updates or sets a single tag of an existing storage item. If you want conflict detection, do specify
 * version which must match the current storage item version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param value Tag value.
 * @param version Expected storage item version.
 * @param options SQL options.
 * @returns Updated storage item tags and version or undefined in case the storage item was deleted, expired, or modified since last read.
 */
export async function setStorageTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag(
    { entityType: EntityType.Storage, filterExpired: true },
    params,
    key,
    value,
    version,
    options
  );
}

/**
 * Deletes a single tag of an existing storage item. If you want conflict detection, do specify
 * version which must match the current connector version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param version Expected storage item version.
 * @param options SQL options.
 * @returns Updated storage item tags and version or undefined in case the storage item was deleted, modified, or modified since last read.
 */
export async function deleteStorageTag(
  params: Model.IEntityKey,
  key: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag(
    { entityType: EntityType.Storage, filterExpired: true },
    params,
    key,
    undefined,
    version,
    options
  );
}
