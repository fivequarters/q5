import http_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { isUuid } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import { IServiceResult } from './BaseComponentService';

interface IOperationParam {
  verb: 'creating' | 'updating' | 'deleting';
  type: Model.EntityType;
}

interface IOperationData extends IOperationParam {
  code: number; // HTTP status codes
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
    const entityId =
      entity.id && entity.id.indexOf('/') >= 0 ? Model.decomposeSubordinateId(entity.id).parentEntityId : entity.id;

    // Is it a non-empty actual number? If so, it's probably a database id - don't use it. This continues the
    // efforts of trying to avoid exposing session, identity, instance, and database id's out through these APIs.
    if (entity.id.indexOf('/') >= 0 && (!isNaN(+entityId) || !isNaN(parseFloat(entityId)) || isUuid(entityId))) {
      console.log(
        `Invalid: ${entity.id}, ${entityId}, ${isNaN(+entityId)}, ${isNaN(parseFloat(entityId))}, ${isUuid(entityId)}`
      );
      throw http_error(500, 'Invalid entityId detected');
    }

    const operation: IOperationData = {
      ...status,
      code: 202,
      location: {
        accountId: entity.accountId,
        subscriptionId: entity.subscriptionId,
        entityId,
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
          operationEntity.data.code = payload.statusCode;
          operationEntity.data.payload = payload.result;
        } else {
          operationEntity.data.code = 200;
        }
      } catch (err) {
        console.log(err);
        // Update operation with the error message
        operationEntity.data = { ...operation, code: err.status || err.statusCode || 500, message: err.message };
      }

      console.log(
        `OPR /v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/operation/${operationId} ${
          operationEntity.data.code
        } - ${status.verb} ${status.type} ${entity.id} ${
          operationEntity.data.message ? `: ${operationEntity.data.message}` : ''
        }`
      );
      await this.dao.updateEntity(operationEntity);
    });

    // Return operation with operationId populated
    return { statusCode: 202, result: { operationId } };
  };
}

const operationService = new OperationService();
export { IOperationData, IOperationAction, operationService };
