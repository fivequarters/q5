import http_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { isUuid, API_PUBLIC_ENDPOINT } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import { IServiceResult } from './BaseEntityService';

export enum OperationVerbs {
  creating = 'creating',
  updating = 'updating',
  deleting = 'deleting',
}

interface IOperationParam {
  verb: OperationVerbs;
  type: Model.EntityType;
}

interface IOperationData extends IOperationParam {
  statusCode: number; // HTTP status codes
  message?: string;
  location: {
    accountId: string;
    subscriptionId: string;
    entityId?: string;
    entityType: Model.EntityType;
  };
}

type IOperationAction = (operationId: string) => Promise<IServiceResult | void>;

class OperationService {
  protected dao: Model.IEntityDao<Model.IOperation>;
  constructor() {
    this.dao = RDS.DAO.operation;
  }

  public inOperation = async (
    entityType: Model.EntityType,
    entity: Model.IEntity,
    status: IOperationParam,
    op: IOperationAction
  ): Promise<IServiceResult> => {
    // Get the entity

    // Create operation with the status
    const operationId = uuidv4();

    const operation: IOperationData = {
      ...status,
      statusCode: 202,
      location: {
        accountId: entity.accountId,
        subscriptionId: entity.subscriptionId,
        entityId: entity.id,
        entityType,
      },
    };

    let operationEntity: Model.IOperation = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      id: operationId,
      data: operation,
    };

    // Update the entity with status, operation, but not new data (that gets written after success)
    operationEntity = await this.dao.createEntity(operationEntity);

    // Queue up the operation to occur during the next event cycle, clearing the operation when done.
    setImmediate(async () => {
      try {
        const payload = await op(operationId);

        if (payload) {
          operationEntity.data.statusCode = payload.statusCode;
          operationEntity.data.payload = payload.result;
        } else {
          operationEntity.data.statusCode = 200;
        }
      } catch (err) {
        if (err.message && err.message.match(/duplicate key value/)) {
          operationEntity.data = { ...operation, statusCode: 400, message: `Duplicate key value: ${entity.id}` };
        } else {
          // Update operation with the error message
          operationEntity.data = {
            ...operation,
            statusCode: err.status || err.statusCode || 500,
            message: err.message,
          };
        }
      }

      console.log(
        `OPR /v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/operation/${operationId} ${
          operationEntity.data.statusCode
        } - ${status.verb} ${status.type} ${entity.id} ${
          operationEntity.data.message ? `: ${operationEntity.data.message}` : ''
        }`
      );
      await this.dao.updateEntity(operationEntity);
    });

    // Return operation with operationId populated
    const baseUrl = `${API_PUBLIC_ENDPOINT}/v2/account/${entity.accountId}/subscription/${entity.subscriptionId}`;

    let target;
    const statusOnly = `${baseUrl}/operation/${operationId}`;

    if (entityType === Model.EntityType.session) {
      const integrationId = Model.decomposeSubordinateId(entity.id).parentEntityId;
      target = `${baseUrl}/integration/${integrationId}/instance?operation=${operationId}`;
    } else if (entityType === Model.EntityType.integration) {
      target = `${baseUrl}/integration?operation=${operationId}`;
    } else if (entityType === Model.EntityType.connector) {
      target = `${baseUrl}/connector?operation=${operationId}`;
    }

    return { statusCode: 202, result: { operationId, target, statusOnly } };
  };

  protected getByOperation = async (
    params: {
      accountId: string;
      subscriptionId: string;
    },
    request: Model.EntityType,
    operationId: string,
    integrationId?: string
  ): Promise<{ statusCode: number; result: Model.IEntity | string | undefined }> => {
    // Get the operation to validate it's pointed at the expected object class and type
    const operation = await this.dao.getEntity({
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: operationId,
    });

    // Healthchecks to make sure the request is valid and hung off of the right object for the operationId
    if (request === Model.EntityType.instance) {
      if (operation.data.location.entityType !== Model.EntityType.session) {
        throw http_error(404);
      }
    } else {
      if (operation.data.location.entityType !== request) {
        throw http_error(404);
      }
    }

    // If the operation is errored, incomplete, or doesn't apply to an entity, return with that status
    if (operation.data.statusCode !== 200 || !operation.data.location.entityId) {
      return { statusCode: operation.data.statusCode, result: operation.data.message };
    }

    // Handle the connector and integration case
    if (request === Model.EntityType.connector || request === Model.EntityType.integration) {
      if (operation.data.verb === OperationVerbs.deleting) {
        return { statusCode: 200, result: undefined };
      }
      const entity = await RDS.DAO[request].getEntity({
        accountId: params.accountId,
        subscriptionId: params.subscriptionId,
        id: operation.data.location.entityId,
      });

      return { statusCode: 200, result: entity };
    }

    // Look up an instance via a session
    if (request !== Model.EntityType.instance) {
      throw http_error(500, 'Not supported');
    }

    if (!integrationId) {
      throw http_error(400, 'Missing integration');
    }

    // Load the session specified in the operation
    const session = await RDS.DAO[Model.EntityType.session].getEntity({
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: operation.data.location.entityId,
    });

    // Fetch the parent, to filter for instances under this integration
    const parentEntity = await RDS.DAO[Model.EntityType.integration].getEntity({
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: integrationId,
    });
    if (!parentEntity.__databaseId) {
      throw http_error(500, 'Missing id');
    }

    // Load the instance using the instanceId from the session.data.output
    const instanceId = session.data.output.entityId;
    if (!instanceId) {
      return { statusCode: 404, result: 'instance not found' };
    }

    const instance = await RDS.DAO[Model.EntityType.instance].getEntity({
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: Model.createSubordinateId(Model.EntityType.integration, parentEntity.__databaseId, instanceId),
    });

    return { statusCode: 200, result: instance };
  };

  public getInstanceByOperation = async (
    params: {
      accountId: string;
      subscriptionId: string;
    },
    operationId: string,
    integrationId: string
  ): Promise<{ statusCode: number; result: Model.IEntity | string | undefined }> => {
    return this.getByOperation(params, Model.EntityType.instance, operationId, integrationId) as Promise<{
      statusCode: number;
      result: Model.IInstance | string | undefined;
    }>;
  };

  public getEntityByOperation = async (
    params: {
      accountId: string;
      subscriptionId: string;
    },
    operationId: string,
    entityType: Model.EntityType
  ): Promise<{ statusCode: number; result: Model.IIntegration | Model.IConnector | string | undefined }> => {
    if (entityType !== Model.EntityType.connector && entityType !== Model.EntityType.integration) {
      throw http_error(500, 'Invalid entity type');
    }
    return this.getByOperation(params, entityType, operationId) as Promise<{
      statusCode: number;
      result: Model.IIntegration | Model.IConnector | string | undefined;
    }>;
  };
}

const operationService = new OperationService();
export { IOperationData, IOperationAction, operationService };
