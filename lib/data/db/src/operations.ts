import * as Model from './model';

//--------------------------------
// General
//--------------------------------

export async function createTransaction(): Promise<string> {
  throw new Error('Not implemented');
}

export async function commitTransaction(transactionId: string): Promise<void> {
  throw new Error('Not implemented');
}

export async function rollbackTransaction(transactionId: string): Promise<void> {
  throw new Error('Not implemented');
}

//--------------------------------
// Integrations
//--------------------------------

export async function getIntegration(params: Model.IEntityKey): Promise<Model.IIntegration> {
  throw new Error('Not implemented');
}

export async function deleteIntegration(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function createIntegration(params: Model.IIntegration, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function listIntegrations(params: Model.IListRequest): Promise<Model.IListResponse> {
  throw new Error('Not implemented');
}

export async function updateIntegration(params: Model.IIntegration, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function getIntegrationTags(params: Model.IEntityKey): Promise<Model.ITags> {
  throw new Error('Not implemented');
}

export async function setIntegrationTags(
  params: Model.IEntityKey,
  tags: Model.ITags,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function setIntegrationTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function deleteIntegrationTag(
  params: Model.IEntityKey,
  key: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

//--------------------------------
// Connectors
//--------------------------------

export async function getConnector(params: Model.IEntityKey): Promise<Model.IConnector> {
  throw new Error('Not implemented');
}

export async function deleteConnector(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function createConnector(params: Model.IConnector, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function listConnectors(params: Model.IListRequest): Promise<Model.IListResponse> {
  throw new Error('Not implemented');
}

export async function updateConnector(params: Model.IIntegration, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function getConnectorTags(params: Model.IEntityKey): Promise<Model.ITags> {
  throw new Error('Not implemented');
}

export async function setConnectorTags(
  params: Model.IEntityKey,
  tags: Model.ITags,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function setConnectorTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function deleteConnectorTag(
  params: Model.IEntityKey,
  key: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

//--------------------------------
// Storage
//--------------------------------

export async function getStorage(params: Model.IEntityKey): Promise<Model.IStorageItem> {
  throw new Error('Not implemented');
}

export async function deleteStorage(
  params: Model.IEntityKey,
  recursive?: boolean,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function putStorage(
  params: Model.IStorageItem,
  expectedEtag?: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function listStorage(params: Model.IListRequest): Promise<Model.IListResponse> {
  throw new Error('Not implemented');
}

export async function getStorageTags(params: Model.IEntityKey): Promise<Model.ITags> {
  throw new Error('Not implemented');
}

export async function setStorageTags(
  params: Model.IEntityKey,
  tags: Model.ITags,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function setStorageTag(
  params: Model.IEntityKey,
  key: string,
  value: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

export async function deleteStorageTag(
  params: Model.IEntityKey,
  key: string,
  options?: Model.IStatementOptions
): Promise<void> {
  throw new Error('Not implemented');
}

//--------------------------------
// Operation
//--------------------------------

export async function getOperation(params: Model.IEntityKey): Promise<Model.IOperation> {
  throw new Error('Not implemented');
}

export async function deleteOperation(params: Model.IEntityKey, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}

export async function putOperation(params: Model.IOperation, options?: Model.IStatementOptions): Promise<void> {
  throw new Error('Not implemented');
}
