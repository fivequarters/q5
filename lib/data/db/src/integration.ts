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
// Integrations
//--------------------------------

/**
 * Gets an integration.
 * @param params Primary keys.
 * @returns Integration definition or undefined if no matching integration found.
 */
export async function getIntegration(params: Model.IEntityKey): Promise<Model.IIntegration | undefined> {
  return (await getEntity({ entityType: EntityType.Integration }, params)) as Model.IIntegration;
}

/**
 * Ensures the integration is deleted.
 * @param params Primary keys.
 * @param options SQL options.
 * @returns Returns true if the integration was deleted or false if it did not exist.
 */
export async function deleteIntegration(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<boolean> {
  return await deleteEntity({ entityType: EntityType.Integration }, params, options);
}

/**
 * Creates new integration.
 * @param params Integration definition.
 * @param options SQL options.
 * @returns The newly created integration's definition.
 */
export async function createIntegration(
  params: Model.IIntegrationCreateRequest,
  options?: Model.IStatementOptions
): Promise<Model.IIntegration> {
  return (await createEntity(
    { entityType: EntityType.Integration },
    { ...params, expires: undefined },
    options
  )) as Model.IIntegration;
}

/**
 * Lists integrations matching search criteria, with paging support. Returns up to 100 records at a time.
 * @param params Search and continuation criteria
 * @returns List of integrations and the `next` continuation token if there is more data to get.
 */
export async function listIntegrations(params: Model.IListRequest): Promise<Model.IListResponse> {
  return await listEntities({ entityType: EntityType.Integration }, params);
}

/**
 * Updates existing integration. If you want conflict detection, do specify params.version which must match
 * the current version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure params.version is undefined.
 * @param params New integration definiton.
 * @param options SQL options.
 * @returns Updated integration instance or undefined in case the integration was deleted or modified since last read.
 */
export async function updateIntegration(
  params: Model.IIntegrationCreateRequest,
  options?: Model.IStatementOptions
): Promise<Model.IIntegration | undefined> {
  return (await updateEntity(
    { entityType: EntityType.Integration },
    { ...params, expires: undefined },
    options
  )) as Model.IIntegration;
}

/**
 * Gets integration tags.
 * @param params Primary keys.
 * @returns Integration tags and version or undefined if no matching integration found.
 */
export async function getIntegrationTags(params: Model.IEntityKey): Promise<Model.ITagsWithVersion | undefined> {
  return await getEntityTags({ entityType: EntityType.Integration }, params);
}

/**
 * Updates tags of an existing integration. If you want conflict detection, do specify tags.version which must match
 * the current integration version in the database (it gets returned from the get... method so it is easy to roundtrip by default).
 * If you want to forcefully override the persisted version, make sure tags.version is undefined.
 * @param params Primary keys.
 * @param tags New integration tags and expected version.
 * @param options SQL options.
 * @returns Updated integration tags and version or undefined in case the integration was deleted or modified since last read.
 */
export async function setIntegrationTags(
  params: Model.IEntityKey,
  tags: Model.ITagsWithVersion,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await updateEntityTags({ entityType: EntityType.Integration }, params, tags, options);
}

/**
 * Updates or sets a single tag of an existing integration. If you want conflict detection, do specify
 * version which must match the current integration version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param value Tag value.
 * @param version Expected integration version.
 * @param options SQL options.
 * @returns Updated integration tags and version or undefined in case the integration was deleted or modified since last read.
 */
export async function setIntegrationTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag({ entityType: EntityType.Integration }, params, key, value, version, options);
}

/**
 * Deletes a single tag of an existing integration. If you want conflict detection, do specify
 * version which must match the current integration version in the database. If you want to forcefully override
 * the persisted version, make sure version is undefined.
 * @param params Primary keys.
 * @param key Tag key.
 * @param version Expected integration version.
 * @param options SQL options.
 * @returns Updated integration tags and version or undefined in case the integration was deleted or modified since last read.
 */
export async function deleteIntegrationTag(
  params: Model.IEntityKey,
  key: string,
  version?: number,
  options?: Model.IStatementOptions
): Promise<Model.ITagsWithVersion | undefined> {
  return await setEntityTag({ entityType: EntityType.Integration }, params, key, undefined, version, options);
}
