import http_error from 'http-errors';

import { v4 as uuidv4 } from 'uuid';
import RDS, { Model } from '@5qtrs/db';

import BaseComponentService, { IServiceResult, ISubordinateId } from './BaseComponentService';
import { operationService } from './OperationService';

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
    if (step.target.type === 'generic') {
      return step.target.handlers.step;
    }
    return {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityType: 'connector',
      entityId: this.decomposeSubordinateId(params.id).componentId,
      sessionId: this.decomposeSubordinateId(params.id).subordinateId,
      ...step.target,
    };
  };

  public createSession = async (
    entity: Model.IEntity,
    sessionDetails: Model.ISessionParameters
  ): Promise<IServiceResult> => {
    // Load the entity from entity.entityId
    const component = await this.dao.getEntity(entity);

    // Get the steps, or intuit them based on connectors specified.
    let stepList: string[];
    let steps: { [stepName: string]: Model.IStep } = {};
    let tags: Model.ITags;
    const sessionId = uuidv4();

    // Present in the component; use as specified.
    steps = component.data.configuration.creation.steps;

    // If there's a specific order or subset specified, use that instead of the full list.
    stepList = sessionDetails.steps ? sessionDetails.steps : Object.keys(steps);

    if (!stepList.length) {
      throw http_error(400, 'No matching steps found');
    }

    // Any tags present?
    tags = (sessionDetails.tags ? sessionDetails.tags : component.data.configuration.creation?.tags) || {};
    tags['fusebit.sessionId'] = sessionId;

    console.log(`createSession ${JSON.stringify(steps)}`);
    // Validate DAG of 'uses' parameters, if any - this should happen also in component creation.
    const dagSteps: string[] = [];
    stepList.forEach((stepName) => {
      dagSteps.push(stepName);
      if (!steps[stepName]) {
        throw http_error(400, `Unknown step '${stepName}'`);
      }
      steps[stepName].uses?.forEach((usesStep) => {
        if (!dagSteps.includes(usesStep)) {
          throw http_error(400, `Ordering violation: 'uses' in '${stepName}' for '${usesStep}' before declaration.`);
        }
      });
    });

    // If there's any additional input or uses parameters, include those in the specification.
    Object.entries(sessionDetails.input || {}).forEach((entry: [string, object]) => {
      if (!steps[entry[0]]) {
        throw http_error(400, `Unknown step '${entry[0]}'`);
      }
      steps[entry[0]].input = entry[1];
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
        mode: 'trunk',
        steps: stepList.map((stepName: string) => ({ ...steps[stepName], stepName })),
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
    params: { accountId: string; subscriptionId: string; entityType: string; componentId: string },
    reference: { parentId: string; stepName: string },
    step: Model.IStep
  ): Promise<IServiceResult> => {
    const sessionId = uuidv4();

    // Create a new session.
    const session: Model.ILeafSession = {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: this.createSubordinateId({ ...params, subordinateId: sessionId }),
      data: {
        mode: 'leaf',
        stepName: step.stepName,
        input: step.input,
        output: step.output,
        target: step.target,
        meta: reference,
      },
    };

    console.log(`createLeafSession`, JSON.stringify(session, null, 2));

    const parentSession = (await this.sessionDao.getEntity({
      ...params,
      id: reference.parentId,
    })) as Model.ITrunkSession;

    console.log(`leafSession parentId`, JSON.stringify(parentSession, null, 2));

    const matchingStep = parentSession.data.steps.find((pstep) => pstep.stepName === reference.stepName);
    if (!matchingStep) {
      throw http_error(400, `Invalid step name: ${reference.stepName}`);
    }

    matchingStep.childSessionId = session.id;

    await this.sessionDao.createEntity(session);
    await this.sessionDao.updateEntity(parentSession);

    return { statusCode: 200, result: session };
  };

  public getSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    return { statusCode: 200, result: session };
  };

  public putSession = async (entity: Model.IEntity, outputValues: any): Promise<IServiceResult> => {
    // Write the contents into the session, return the new session details.
    const session = (await this.sessionDao.getEntity(entity)) as Model.ILeafSession;
    session.data.output = outputValues;
    await this.sessionDao.updateEntity(session);
    return { statusCode: 200, result: session };
  };

  public startSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Get the specified session.
    const session = await this.sessionDao.getEntity(entity);

    // Validate it's the right type of session.
    if (session.data.mode === 'leaf') {
      throw http_error(400, 'cannot start a session already in progress');
    }

    // Get the first step
    const step = session.data.steps[0];

    // Create a session
    const leafSession = await this.createLeafSession(
      {
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        ...(step.target.type === 'connector'
          ? { entityType: 'connector', componentId: step.target.entityId }
          : { entityType: this.entityType, componentId: this.decomposeSubordinateId(session.id).componentId }),
      },
      { parentId: session.id, stepName: step.stepName },
      step
    );

    console.log(`startSession`, JSON.stringify(leafSession, null, 2));

    // Return a 302 to the new session target
    return { statusCode: 302, result: this.getTargetUrl(leafSession.result, leafSession.result.data) };
  };

  public finishSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Load the session
    const session = (await this.sessionDao.getEntity(entity)) as Model.ILeafSession;
    if (session.data.mode !== 'leaf') {
      throw http_error(500, `Cannot finish non-leaf session ${entity.id}`);
    }

    // Load the parent object.
    const parentSession = (await this.sessionDao.getEntity({
      ...entity,
      id: session.data.meta.parentId,
    })) as Model.ITrunkSession;
    if (parentSession.data.mode !== 'trunk') {
      throw http_error(500, `Parent session is the wrong type for ${entity.id}`);
    }

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
        result: `${parentSession.data.meta.redirectUrl}?session=${
          this.decomposeSubordinateId(parentSession.id).subordinateId
        }`,
      };
    }

    // Start a new step session and redirect.
    const stepSession = await this.createLeafSession(
      {
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        ...(step.target.type === 'connector'
          ? { entityType: 'connector', componentId: step.target.entityId }
          : { entityType: this.entityType, componentId: this.decomposeSubordinateId(session.id).componentId }),
      },
      { parentId: parentSession.id, stepName: step.stepName },
      step
    );

    // Return a 302 to the new session target
    return { statusCode: 302, result: this.getTargetUrl(stepSession.result, stepSession.result.data) };
  };

  public postSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Return an operation for creating all of the subsidiary objects.
    return operationService.inOperation(
      Model.EntityType.session,
      entity,
      { verb: 'creating', type: Model.EntityType.session },
      async () => {
        const session = (await this.sessionDao.getEntity(entity)) as Model.ITrunkSession;
        if (session.data.mode !== 'trunk') {
          throw http_error(400, 'cannot persist a non-root session');
        }

        return this.persistTrunkSession(session, this.decomposeSubordinateId(entity.id));
      }
    );
  };

  protected persistTrunkSession = async (
    session: Model.ITrunkSession,
    masterSessionId: ISubordinateId
  ): Promise<IServiceResult> => {
    const entity: Model.IEntity = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: session.id,
    };

    const results: { succeeded: any[]; failed: any[] } = { succeeded: [], failed: [] };
    const leafSessionResults: {
      [stepName: string]: any;
    } = {};

    // Persist each session.
    await (Promise as any).allSettled(
      Object.values(session.data.steps).map(async (step: Model.ITrunkSessionStep) => {
        try {
          const sessionEntity = (await this.sessionDao.getEntity({
            ...entity,
            id: step.childSessionId as string,
          })) as Model.ILeafSession;
          if (sessionEntity.data.mode !== 'leaf') {
            throw http_error(400, 'cannot persist a root session as a leaf');
          }

          const result = await this.persistLeafSession(sessionEntity, masterSessionId);

          // Store the results.
          const decompStepSessionId = this.decomposeSubordinateId(sessionEntity.id);
          results.succeeded.push({
            statusCode: 200,
            stepName: step.stepName,
          });
          leafSessionResults[step.stepName] = {
            accountId: entity.accountId,
            subscriptionId: entity.subscriptionId,
            id: this.decomposeSubordinateId(result.result.id).subordinateId,
            tags: result.result.tags,
            componentId: decompStepSessionId.componentId,
            componentType: decompStepSessionId.entityType,
            entityType: result.result.entityType,
          };
        } catch (e) {
          results.failed.push({
            result: {
              statusCode: 400,
              message: e.message,
              stepName: step.stepName,
            },
          });
        }
      })
    );

    // Create a new `instance` object.
    if (this.entityType !== Model.EntityType.integration) {
      throw http_error(500, `Invalid entity type '${this.entityType}' for ${masterSessionId}`);
    }

    // Get the integration, to get the database id out of.
    const parentEntity = await this.dao.getEntity({
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: masterSessionId.componentId,
    });

    const instance = {
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

    console.log(`persistTrunkSession ${JSON.stringify(instance, null, 2)}`);
    await this.subDao.createEntity(instance);

    const decomposedSessionId = this.decomposeSubordinateId(session.id);

    // Record the master instance
    leafSessionResults[''] = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      componentId: decomposedSessionId.componentId,
      componentType: decomposedSessionId.entityType,
      id: this.decomposeSubordinateId(instance.id).subordinateId,
      entityType: this.subDao.getDaoType(),
      tags: instance.tags,
    };

    return { statusCode: 200, result: leafSessionResults };
  };

  protected persistLeafSession = async (
    session: Model.ILeafSession,
    masterSessionId: ISubordinateId
  ): Promise<IServiceResult> => {
    if (session.data.mode !== 'leaf') {
      throw http_error(400, 'cannot persist a root session as aleaf');
    }

    let result;
    result = await this.instantiateLeafSession(
      session,
      masterSessionId,
      session.data.target.type === Model.EntityType.connector ? this.connectorService : this.integrationService,
      session.data.target.type === Model.EntityType.connector
        ? session.data.target.entityId
        : masterSessionId.componentId
    );

    return result;
  };

  public instantiateLeafSession = async (
    session: Model.ILeafSession,
    masterSessionId: ISubordinateId,
    service: BaseComponentService<any, any>,
    serviceEntityId: string
  ): Promise<IServiceResult> => {
    // Get the database ID to hang this subordinate object off of.
    const parentEntity = await service.dao.getEntity({
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
      data: session.data.output,
      tags: { ...session.tags, 'session.master': masterSessionId.subordinateId },
    };

    console.log(`instantiateService leafEntity ${JSON.stringify(leafEntity, null, 2)}`);
    const result = await this.subDao.createEntity(leafEntity);

    // Don't expose the data in the report.
    delete result.data;

    // Create a new instance/identity based on the data included in entity.data.
    return { statusCode: 200, result };
  };
}
