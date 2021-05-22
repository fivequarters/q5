import { v4 as uuidv4 } from 'uuid';

import BaseComponentService from './BaseComponentService';
import RDS, { Model } from '@5qtrs/db';

import { IOperationStatus, operationService } from './OperationService';

class ConnectorService extends BaseComponentService<Model.IConnector> {
  constructor() {
    super(RDS.DAO.connector);
  }

  public createEntity = async (entity: Model.IEntity) => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'creating', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do update things - create functions, collect their versions, and update the entity.data object
        // appropriately.
        await this.dao.createEntity(entity);
      }
    );
  };

  public updateEntity = async (entity: Model.IEntity): Promise<IOperationStatus> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'updating', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do update things - create functions, collect their versions, and update the entity.data object
        // appropriately.

        // Delta between the two
        // Create a new function specification
        // Publish the function

        // Update it.
        await this.dao.updateEntity(entity);
      }
    );
  };

  public deleteEntity = async (entity: Model.IEntity): Promise<IOperationStatus> => {
    // TODO: Validate the data matches the expected Joi schema (to be eventually promoted) (especially that
    // the payload contents for accountId match the url parameters).

    return operationService.inOperation(
      Model.EntityType.connector,
      entity,
      { verb: 'deleting', type: 'connector' },
      async (operationId: string) => {
        operationId = operationId;
        // Do delete things - create functions, collect their versions, and update the entity.data object
        // appropriately.

        // Delete it.
        await this.dao.deleteEntity(entity);
      }
    );
  };
}

export default ConnectorService;
