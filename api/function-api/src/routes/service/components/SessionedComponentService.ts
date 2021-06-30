import http_error from 'http-errors';

import { v4 as uuidv4 } from 'uuid';
import RDS, { Model } from '@5qtrs/db';

import BaseComponentService, { IServiceResult } from './BaseComponentService';
import { operationService } from './OperationService';

const MasterSessionStepName = '';

export default abstract class SessionedComponentService<
  E extends Model.IEntity,
  F extends Model.IEntity
> extends BaseComponentService<E, F> {
  private readonly sessionDao: Model.IEntityDao<Model.ISession>;
  protected integrationService!: SessionedComponentService<any, any>;
  protected connectorService!: SessionedComponentService<any, any>;

  constructor(dao: Model.IEntityDao<E>, subDao: Model.IEntityDao<F>) {
    super(dao, subDao);
    this.sessionDao = RDS.DAO.session;
  }

  public abstract addService(service: SessionedComponentService<any, any>): void;

  public getTargetUrl = (params: Model.IEntity, step: Model.IStep) => {
    return {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      sessionId: this.decomposeSubordinateId(params.id).subordinateId,
      // Provides entityType, entityId, and path.
      ...step.target,
    };
  };

  public ensureSessionLeaf(
    session: Model.ISession,
    msg: string,
    statusCode: number = 500
  ): asserts session is Model.ILeafSession {
    if (session.data.mode !== Model.SessionMode.leaf) {
      throw http_error(statusCode, `Invalid session type '${session.data.mode}' for '${session.id}': ${msg}`);
    }
  }

  public ensureSessionTrunk(
    session: Model.ISession,
    msg: string,
    statusCode: number = 500
  ): asserts session is Model.ITrunkSession {
    if (session.data.mode !== Model.SessionMode.trunk) {
      throw http_error(statusCode, `Invalid session type '${session.data.mode}' for '${session.id}': ${msg}`);
    }
  }

  public ensureIntegration(dao: Model.IEntityDao<E>, entity: Model.IEntity): asserts entity is Model.IIntegration {
    if (dao.getDaoType() !== Model.EntityType.integration) {
      throw http_error(400, `Invalid entity '${entity.id}' for session request`);
    }
  }

  public createSession = async (
    entity: Model.IEntity,
    sessionDetails: Model.ISessionParameters
  ): Promise<IServiceResult> => {
    // Load the entity from entity.entityId
    const component = (await this.dao.getEntity(entity)) as Model.IIntegration;
    this.ensureIntegration(this.dao, component);

    // Get the steps
    let stepList: Model.IStep[];
    let tags: Model.ITags;
    const sessionId = uuidv4();

    // If there's a specific order or subset specified, use that instead of the full list.
    stepList = sessionDetails.steps
      ? sessionDetails.steps.map((name) => {
          const step = component.data.configuration.creation.steps.find((s) => s.name === name);
          if (!step) {
            throw http_error(400, `Unknown step '${name}'`);
          }
          return step;
        })
      : component.data.configuration.creation.steps;

    if (!stepList.length) {
      throw http_error(400, 'No matching steps found');
    }

    // Any tags present?
    tags = (sessionDetails.tags ? sessionDetails.tags : component.data.configuration.creation?.tags) || {};
    tags['fusebit.sessionId'] = sessionId;

    // Validate DAG of 'uses' parameters, if any - this should happen also in component creation.
    const dagSteps: string[] = [];
    stepList.forEach((step) => {
      dagSteps.push(step.name);

      step.uses?.forEach((usesStep) => {
        if (!dagSteps.includes(usesStep)) {
          throw http_error(400, `Ordering violation: 'uses' in '${step.name}' for '${usesStep}' before declaration.`);
        }
      });
    });

    // If there's any additional input or uses parameters, include those in the specification.
    Object.entries(sessionDetails.input || {}).forEach(([inputName, inputVal]) => {
      const step = stepList.find((s) => s.name === inputName);
      if (!step) {
        throw http_error(400, `Unknown step '${inputName}'`);
      }
      step.input = inputVal;
    });

    // Create a session object that's structured appropriately.
    const session: Model.ISession = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      id: this.createSubordinateId({
        ...entity,
        entityType: this.entityType,
        componentId: entity.id,
        subordinateId: sessionId,
      }),
      data: {
        mode: Model.SessionMode.trunk,
        steps: stepList,
        meta: {
          redirectUrl: sessionDetails.redirectUrl,
        },
      },
    };

    // Write the session object.
    return {
      statusCode: 200,
      result: await this.sessionDao.createEntity(session),
    };
  };

  public createLeafSession = async (
    parentSession: Model.ITrunkSession,
    step: Model.ITrunkSessionStep
  ): Promise<IServiceResult> => {
    if (step.childSessionId) {
      const childEntity = await this.sessionDao.getEntity({
        accountId: parentSession.accountId,
        subscriptionId: parentSession.subscriptionId,
        id: step.childSessionId,
      });
      return { statusCode: 200, result: childEntity };
    }

    const sessionId = uuidv4();

    const params = {
      entityType: step.target.entityType,
      componentId: step.target.entityId,
    };

    // Calculate 'uses' based on previous session ids
    const uses =
      step.uses?.reduce((acc: Record<string, object>, stepName: string) => {
        acc[stepName] = Model.decomposeSubordinateId(
          (parentSession.data.steps.find((s) => s.name === stepName) as Model.ITrunkSessionStep)
            .childSessionId as string
        );
        return acc;
      }, {}) || {};

    // Create a new session.
    const session: Model.ILeafSession = {
      accountId: parentSession.accountId,
      subscriptionId: parentSession.subscriptionId,
      id: this.createSubordinateId({ ...params, subordinateId: sessionId }),
      data: {
        mode: Model.SessionMode.leaf,
        name: step.name,
        input: step.input,
        output: step.output,
        target: step.target,
        uses,
        meta: { parentId: parentSession.id },
      },
    };

    step.childSessionId = session.id;

    await RDS.inTransaction(async (daos) => {
      await daos.session.createEntity(session);
      await daos.session.updateEntity(parentSession);
    });

    return { statusCode: 200, result: session };
  };

  public getSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    return { statusCode: 200, result: session };
  };

  public putSession = async (entity: Model.IEntity, outputValues: any): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    this.ensureSessionLeaf(session, 'cannot PUT a non-in-progress session', 400);

    // Update the output and the object.
    session.data.output = outputValues;
    await this.sessionDao.updateEntity(session);
    return { statusCode: 200, result: session };
  };

  public startSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const parentSession = await this.sessionDao.getEntity(entity);
    this.ensureSessionTrunk(parentSession, 'cannot start a session in progress', 400);

    // Get the first step
    const step = parentSession.data.steps[0];

    // Create a session
    const leafSession = await this.createLeafSession(parentSession, step);

    // Return a 302 to the new session target
    return { statusCode: 302, result: this.getTargetUrl(leafSession.result, leafSession.result.data) };
  };

  public finishSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Load the session
    const session = await this.sessionDao.getEntity(entity);
    this.ensureSessionLeaf(session, 'cannot finish a non-in-progress session', 400);

    // Load the parent object.
    const parentSession = await this.sessionDao.getEntity({
      ...entity,
      id: session.data.meta.parentId,
    });
    this.ensureSessionTrunk(parentSession, 'invalid parent session on finish');

    // Find the step.
    const stepIndex = parentSession.data.steps.findIndex((s) => s.childSessionId === entity.id);

    if (stepIndex < 0) {
      throw http_error(500, `Parent session is missing session id in step for ${entity.id}`);
    }

    const step = parentSession.data.steps[stepIndex + 1];
    if (!step) {
      // If there's no further steps, redirect to the redirectUrl.
      return {
        statusCode: 302,
        result: {
          mode: 'url',
          url: `${parentSession.data.meta.redirectUrl}?session=${
            this.decomposeSubordinateId(parentSession.id).subordinateId
          }`,
        },
      };
    }

    // Start a new step session and redirect.
    const stepSession = await this.createLeafSession(parentSession, step);

    // Return a 302 to the new session target
    return {
      statusCode: 302,
      result: { mode: 'target', ...this.getTargetUrl(stepSession.result, stepSession.result.data) },
    };
  };

  public postSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Return an operation for creating all of the subsidiary objects.
    return operationService.inOperation(
      Model.EntityType.session,
      entity,
      { verb: 'creating', type: Model.EntityType.session },
      async () => {
        const session = await this.sessionDao.getEntity(entity);
        this.ensureSessionTrunk(session, 'cannot post non-master session', 400);

        return this.persistTrunkSession(session, this.decomposeSubordinateId(entity.id));
      }
    );
  };

  protected persistTrunkSession = async (
    session: Model.ITrunkSession,
    masterSessionId: Model.ISubordinateId
  ): Promise<IServiceResult> => {
    const entity: Model.IEntity = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: session.id,
    };

    if (this.entityType !== Model.EntityType.integration) {
      throw http_error(500, `Invalid entity type '${this.entityType}' for ${masterSessionId}`);
    }

    const results: { succeeded: any[]; failed: any[] } = { succeeded: [], failed: [] };
    const leafSessionResults: {
      [name: string]: any;
    } = {};

    let instance: any;

    await RDS.inTransaction(async (daos) => {
      // Persist each session.
      await (Promise as any).allSettled(
        Object.values(session.data.steps).map(async (step: Model.ITrunkSessionStep) => {
          try {
            const sessionEntity = await this.sessionDao.getEntity({
              ...entity,
              id: step.childSessionId as string,
            });
            this.ensureSessionLeaf(sessionEntity, 'invalid session entry in step');

            const result = await this.instantiateLeafSession(
              daos,
              sessionEntity,
              masterSessionId,
              sessionEntity.data.target.entityId
            );

            // Store the results.
            const decompStepSessionId = this.decomposeSubordinateId(sessionEntity.id);
            results.succeeded.push({
              statusCode: 200,
              name: step.name,
            });
            leafSessionResults[step.name] = {
              accountId: entity.accountId,
              subscriptionId: entity.subscriptionId,
              id: this.decomposeSubordinateId(result.result.id).subordinateId,
              tags: result.result.tags,
              componentId: decompStepSessionId.componentId,
              componentType: decompStepSessionId.entityType,
              entityType: result.result.entityType,
            };
          } catch (e) {
            console.log(e);
            results.failed.push({
              result: {
                statusCode: 400,
                message: e.message,
                name: step.name,
              },
            });
          }
        })
      );

      // Create a new `instance` object.
      // Get the integration, to get the database id out of.
      const parentEntity = await daos[this.entityType].getEntity({
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        id: masterSessionId.componentId,
      });

      instance = {
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        id: this.createSubordinateId({
          entityType: this.entityType,
          componentId: parentEntity.__databaseId as string,
          subordinateId: uuidv4(),
        }),
        data: { output: leafSessionResults },
        tags: { ...session.tags, 'session.master': masterSessionId.subordinateId },
      };

      await daos[this.subDao!.getDaoType()].createEntity(instance);
    });
    const decomposedSessionId = this.decomposeSubordinateId(session.id);

    if (!instance) {
      return { statusCode: 500, result: leafSessionResults };
    }

    // Record the master instance
    leafSessionResults[MasterSessionStepName] = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      componentId: decomposedSessionId.componentId,
      componentType: decomposedSessionId.entityType,
      id: this.decomposeSubordinateId(instance.id).subordinateId,
      entityType: this.subDao!.getDaoType(),
      tags: instance.tags,
    };

    return { statusCode: results.failed.length === 0 ? 200 : 500, result: leafSessionResults };
  };

  protected persistFromSession = async (dao: Model.IEntityDao<E>, replacementIntegrationId?: string) => {
    if (!!replacementIntegrationId) {
    }
  };

  public instantiateLeafSession = async (
    daos: Model.IDaoCollection,
    session: Model.ILeafSession,
    masterSessionId: Model.ISubordinateId,
    serviceEntityId: string
  ): Promise<IServiceResult> => {
    const service =
      session.data.target.entityType === Model.EntityType.connector ? this.connectorService : this.integrationService;

    // Get the database ID to hang this subordinate object off of.
    const parentEntity = await daos[service.dao.getDaoType()].getEntity({
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: serviceEntityId,
    });

    const leafEntity = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: this.createSubordinateId({
        entityType: service.entityType,
        componentId: parentEntity.__databaseId as string,
        subordinateId: uuidv4(),
      }),
      data: session.data.output || {},
      tags: { ...session.tags, 'session.master': masterSessionId.subordinateId },
    };

    const result = await daos[service.subDao!.getDaoType()].createEntity(leafEntity);

    // Don't expose the data in the report.
    delete result.data;

    // Create a new instance/identity based on the data included in entity.data.
    return { statusCode: 200, result };
  };
}
