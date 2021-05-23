import { v4 as uuidv4 } from 'uuid';

import RDS, { Model } from '@5qtrs/db';

interface IOperationStatus {
  operationId: string;
}

type IOperationResult = [number, IOperationStatus];

interface IOperationParam {
  verb: 'creating' | 'updating' | 'deleting';
  type: 'connector' | 'integration';
}

interface IOperationData extends IOperationParam {
  code: number; // HTTP status codes
  message?: string;
  location: { accountId: string; subscriptionId: string; entityId: string; entityType: Model.EntityType };
}

type IOperationAction = (operationId: string) => Promise<void>;

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
  ): Promise<IOperationResult> => {
    // Get the entity

    // Create operation with the status
    const operationId = uuidv4();
    const operation: IOperationData = {
      ...status,
      code: 202,
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
        await op(operationId);

        operationEntity.data.code = 200;
      } catch (err) {
        // Update operation with the error message
        operationEntity.data = { ...status, code: err.status || err.statusCode || 500, message: err.message };
      }

      console.log(
        `OPR /v2/account/${entity.accountId}/subscription/${entity.subscriptionId}/operation/${operationId} ${
          operationEntity.data.code
        } - ${status.verb} ${status.type} ${entity.id} ${
          operationEntity.data.message ? `: ${operationEntity.data.message}` : ''
        }`
      );
      const result = await this.dao.updateEntity(operationEntity);
    });

    // Return operation with operationId populated
    return [202, { operationId }];
  };
}

const operationService = new OperationService();
export { IOperationResult, IOperationData, IOperationAction, operationService };
