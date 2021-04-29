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
  updateEntity,
} from './entity';

//--------------------------------
// Connectors
//--------------------------------

/**
 * Gets a connector.
 * @param params Primary keys.
 * @returns Connector definition or undefined if no matching connector found.
 */
export async function getConnector(params: Model.IEntityKey): Promise<Model.IConnector | undefined> {
  return (await getEntity({ entityType: EntityType.Connector }, params)) as Model.IConnector;
}

/**
 * Ensures the connector is deleted.
 * @param params Primary keys.
 * @param options SQL options.
 * @returns Returns true if the connector was deleted or false if it did not exist.
 */
export async function deleteConnector(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<boolean> {
  return await deleteEntity({ entityType: EntityType.Connector }, params, options);
}

/**
 * Creates new connector.
 * @param params Connector definition.
 * @param options SQL options.
 * @returns The newly created connector's definition.
 */
export async function createConnector(
  params: Model.IConnectorCreateRequest,
  options?: Model.IStatementOptions
): Promise<Model.IConnector> {
  return (await createEntity(
    { entityType: EntityType.Connector },
    { ...params, expires: undefined },
    options
  )) as Model.IConnector;
}

/**
 * Lists connectors matching search criteria, with paging support. Returns up to 100 records at a time.
 * @param params Search and continuation criteria
 * @returns List of connectors and the `next` continuation token if there is more data to get.
 */
export async function listConnectors(params: Model.IListRequest): Promise<Model.IListResponse> {
  return await listEntities({ entityType: EntityType.Connector }, params);
}

/**
 * Updates existing connector. If you want conflict detection, do specify params.version which must match
 * the current version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure params.version is undefined.
 * @param params New connector definiton.
 * @param options SQL options.
 * @returns Updated connector instance or undefined in case the connector was deleted or modified since last read.
 */
export async function updateConnector(
  params: Model.IConnectorCreateRequest,
  options?: Model.IStatementOptions
): Promise<Model.IConnector | undefined> {
  return (await updateEntity(
    { entityType: EntityType.Connector },
    { ...params, expires: undefined },
    options
  )) as Model.IConnector;
}

/**
 * Gets connector tags.
 * @param params Primary keys.
 * @returns Connector tags and version or undefined if no matching connector found.
 */
export async function getConnectorTags(params: Model.IEntityKey): Promise<Model.ITagsWithVersion | undefined> {
  return await getEntityTags({ entityType: EntityType.Connector }, params);
}

/**
 * Updates tags of an existing connector. If you want conflict detection, do specify tags.version which must match
 * the current connector version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure tags.version is undefined.
 * @param params Primary keys.
 * @param tags New connector tags and expected version.
 * @param options SQL options.
 * @returns Updated connector tags and version or undefined in case the connector was deleted or modified since last read.
 */
export async function setConnectorTags(
  params: Model.IEntityKey,
  tags: Model.ITagsWithVersion,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await updateEntityTags({ entityType: EntityType.Connector }, params, tags, options);
}

/**
 * Updates or sets a single tag of an existing connector. If you want conflict detection, do specify
 * version which must match the current connector version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param value Tag value.
 * @param version Expected connector version.
 * @param options SQL options.
 * @returns Updated connector tags and version or undefined in case the connector was deleted or modified since last read.
 */
export async function setConnectorTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag({ entityType: EntityType.Connector }, params, key, value, version, options);
}

/**
 * Deletes a single tag of an existing connector. If you want conflict detection, do specify
 * version which must match the current connector version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param version Expected connector version.
 * @param options SQL options.
 * @returns Updated connector tags and version or undefined in case the connector was deleted or modified since last read.
 */
export async function deleteConnectorTag(
  params: Model.IEntityKey,
  key: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag({ entityType: EntityType.Connector }, params, key, undefined, version, options);
}
