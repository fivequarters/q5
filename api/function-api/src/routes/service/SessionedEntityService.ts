import http_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { EPHEMERAL_ENTITY_EXPIRATION } from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

import BaseEntityService, { IServiceResult } from './BaseEntityService';
import { EntityState, OperationType, OperationStatus } from '@fusebit/schema';

export default abstract class SessionedEntityService<
  E extends Model.IEntity,
  F extends Model.IEntity
> extends BaseEntityService<E, F> {
  private readonly sessionDao: Model.IEntityDao<Model.ISession>;
  public integrationService!: SessionedEntityService<any, any>;
  public connectorService!: SessionedEntityService<any, any>;

  constructor(dao: Model.IEntityDao<E>, subDao: Model.IEntityDao<F>) {
    super(dao, subDao);
    this.sessionDao = RDS.DAO.session;
  }

  public abstract addService(service: SessionedEntityService<any, any>): void;

  public getTargetElements = (params: Model.IEntity, step: Model.IStep) => {
    return {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      sessionId: Model.decomposeSubordinateId(params.id).entityId,
      entityType: step.entityType,
      entityId: step.entityId,
      path: step.path,
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
    entity = await this.dao.getEntity(entity);
    this.ensureIntegration(this.dao, entity);

    // Get the components
    let stepList: Model.IStep[];
    let tags: Model.ITags;
    const sessionId = uuidv4();

    // If there's a specific order or subset specified, use that instead of the full list.
    const dagCheck: { [step: string]: boolean } = {};
    if (sessionDetails.components) {
      stepList = sessionDetails.components.map((name) => {
        const step = entity.data.components.find((comp: Model.IIntegrationComponent) => comp.name === name);
        if (!step) {
          throw http_error(400, `Unknown component '${name}'`);
        }
        // Validate DAG of 'dependsOn' parameters.
        step.dependsOn.forEach((s: string) => {
          if (!dagCheck[s]) {
            throw http_error(400, `Ordering violation: 'dependsOn' in '${step.name}' for '${s}' before declaration.`);
          }
        });

        dagCheck[step.name] = true;

        return step;
      });
    } else {
      stepList = entity.data.components.filter((comp: Model.IIntegrationComponent) => !comp.skip);
    }

    if (!stepList.length) {
      throw http_error(400, 'No matching components found');
    }

    // Any tags present? Include any on the entity, if the session says to extend rather than replace.
    tags = { ...(sessionDetails.extendTags ? entity.data.componentTags : {}), ...sessionDetails.tags };

    // If there's any additional input or uses parameters, include those in the specification.
    Object.entries(sessionDetails.input || {}).forEach(([inputName, inputVal]) => {
      const step = stepList.find((s) => s.name === inputName);
      if (!step) {
        throw http_error(400, `Input specified for unknown component '${inputName}'`);
      }
      step.input = inputVal;
    });

    // Create a session object that's structured appropriately.
    const session: Model.ISession = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      id: Model.createSubordinateId(this.entityType, entity.id, sessionId),
      data: {
        replacementTargetId: sessionDetails.instanceId,
        mode: Model.SessionMode.trunk,
        components: stepList,
        redirectUrl: sessionDetails.redirectUrl,
      },
      tags,
      expires: new Date(Date.now() + EPHEMERAL_ENTITY_EXPIRATION).toISOString(),
    };

    // Write the session object.
    return {
      statusCode: 200,
      result: await this.sessionDao.createEntity(session),
    };
  };

  public createLeafSession = async (
    parentSession: Model.ITrunkSession,
    step: Model.IStep,
    instance?: Model.IInstance
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

    // Calculate 'dependsOn' based on previous session ids
    const dependsOn = step.dependsOn
      .map((stepName: string) => {
        // Validate it's correct for typesafety.
        const match = parentSession.data.components.find((comp: Model.IStep) => comp.name === stepName);
        if (!match) {
          throw http_error(500, `Unknown component '${stepName}' required by '${step.name}'`);
        }
        if (!match.childSessionId) {
          throw http_error(500, `Component '${stepName}' not configured in '${step.name}'`);
        }
        return { stepName, childSessionId: match.childSessionId };
      })
      .reduce((acc: Record<string, object>, { stepName, childSessionId }) => {
        acc[stepName] = Model.decomposeSubordinateId(childSessionId);
        return acc;
      }, {});

    let replacementTargetId: string | undefined;
    let previousOutput;
    if (!!parentSession.data.replacementTargetId && !!instance) {
      if (step.entityType === Model.EntityType.integration) {
        replacementTargetId = instance.id;
        previousOutput = instance.data[step.name];
      } else {
        const stepEntity = instance.data[step.name];
        replacementTargetId = stepEntity.entityId;

        const connector = await this.connectorService.dao.getEntity({
          id: stepEntity.parentEntityId,
          accountId: parentSession.accountId,
          subscriptionId: parentSession.subscriptionId,
        });
        const identity = await this.connectorService.subDao!.getEntity({
          id: Model.createSubordinateId(
            Model.EntityType.connector,
            connector.__databaseId as string,
            replacementTargetId as string
          ),
          accountId: parentSession.accountId,
          subscriptionId: parentSession.subscriptionId,
        });
        previousOutput = identity.data;
      }
    }

    // Create a new session.
    const session: Model.ILeafSession = {
      accountId: parentSession.accountId,
      subscriptionId: parentSession.subscriptionId,
      id: Model.createSubordinateId(step.entityType, step.entityId, sessionId),
      data: {
        ...step,
        mode: Model.SessionMode.leaf,
        name: step.name,
        input: step.input,
        output: previousOutput,
        dependsOn,
        parentId: parentSession.id,
        replacementTargetId,
      },
      tags: parentSession.tags,
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
    if (session.data.mode === Model.SessionMode.trunk) {
      session.data.components = session.data.components.map((step) => ({
        ...step,
        childSessionId: step.childSessionId ? Model.decomposeSubordinateId(step.childSessionId).entityId : undefined,
      }));
    }

    return { statusCode: 200, result: session };
  };

  public putSession = async (
    entity: Model.IEntity,
    sessionParameters: { output: any; tags: Model.ITags }
  ): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    this.ensureSessionLeaf(session, 'Cannot PUT a non-in-progress session', 400);

    // Update the output and the object.
    session.data.output = sessionParameters.output;
    session.tags = { ...session.tags, ...sessionParameters.tags };
    await this.sessionDao.updateEntity(session);
    return { statusCode: 200, result: session };
  };

  private getSessionInstance = async (trunkSession: Model.ITrunkSession): Promise<Model.IInstance | undefined> => {
    if (!trunkSession.data.replacementTargetId) {
      return undefined;
    }
    const parentIntegrationParams = {
      accountId: trunkSession.accountId,
      subscriptionId: trunkSession.subscriptionId,
      id: Model.decomposeSubordinateId(trunkSession.id).parentEntityId,
    };
    const parentIntegration = await this.integrationService.dao.getEntity(parentIntegrationParams);
    const instanceId = Model.createSubordinateId(
      Model.EntityType.integration,
      parentIntegration.__databaseId as string,
      trunkSession.data.replacementTargetId as string
    );
    const instanceParams = {
      id: instanceId,
      accountId: trunkSession.accountId,
      subscriptionId: trunkSession.subscriptionId,
    };
    const instance = await this.integrationService.subDao!.getEntity(instanceParams);
    return instance;
  };

  public startSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const parentSession = await this.sessionDao.getEntity(entity);
    this.ensureSessionTrunk(parentSession, 'cannot start a session in progress', 400);

    // Get instance if needed
    const instance = await this.getSessionInstance(parentSession);

    // Get the first step
    const step = parentSession.data.components[0];

    // Create a session
    const leafSession = await this.createLeafSession(parentSession, step, instance);

    // Return a 302 to the new session target
    return { statusCode: 302, result: this.getTargetElements(leafSession.result, leafSession.result.data) };
  };

  public finishSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Load the session
    const session = await this.sessionDao.getEntity(entity);
    this.ensureSessionLeaf(session, 'cannot finish a non-in-progress session', 400);

    // Load the parent object.
    const parentSession = await this.sessionDao.getEntity({
      ...entity,
      id: session.data.parentId,
    });
    this.ensureSessionTrunk(parentSession, 'invalid parent session on finish');

    // Find the step.
    const stepIndex = parentSession.data.components.findIndex((s) => s.childSessionId === entity.id);

    if (stepIndex < 0) {
      throw http_error(500, `Parent session is missing session id`);
    }

    const step = parentSession.data.components[stepIndex + 1];

    // Did the session error out, such that the sequence should be aborted and the browser sent to the final
    // redirect with the error details as query parameters?
    if (!step || session.data.output?.error) {
      const url = new URL(parentSession.data.redirectUrl);
      if (session.data.output?.error) {
        url.searchParams.set('error', session.data.output.error);
      }
      if (session.data.output?.errorDescription) {
        url.searchParams.set('errorDescription', session.data.output.errorDescription);
      }
      url.searchParams.set('session', Model.decomposeSubordinateId(parentSession.id).entityId);
      return {
        statusCode: 302,
        result: {
          mode: 'url',
          url: url.toString(),
        },
      };
    }

    // Get instance if needed
    const instance = await this.getSessionInstance(parentSession);
    // Start a new step session and redirect.
    const stepSession = await this.createLeafSession(parentSession, step, instance);

    // Return a 302 to the new session target
    return {
      statusCode: 302,
      result: { mode: 'target', ...this.getTargetElements(stepSession.result, stepSession.result.data) },
    };
  };

  public commitSession = async (entity: Model.IEntity): Promise<string> => {
    // Triggers an async process to commit the session.
    let session = await this.sessionDao.getEntity(entity);
    this.ensureSessionTrunk(session, 'cannot post non-master session', 400);
    if (session.data.components) {
      for (const component of session.data.components) {
        if (!component.childSessionId) {
          throw http_error(500, 'Missing child session id');
        }
        const componentSession = await this.sessionDao.getEntity({
          accountId: session.accountId,
          subscriptionId: session.subscriptionId,
          id: component.childSessionId,
        });
        if (componentSession.data.output?.error) {
          throw http_error(400, componentSession.data.output.error);
        }
      }
    }

    const instanceId = session.data.replacementTargetId || uuidv4();

    const masterSessionId = Model.decomposeSubordinateId(session.id);

    const parentEntity: Model.IEntity = await this.dao!.getEntity({
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: masterSessionId.parentEntityId,
    });

    const instance: Model.IInstance = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: Model.createSubordinateId(this.entityType, parentEntity.__databaseId as string, instanceId),
      data: null,
    };

    if (session.data.replacementTargetId) {
      instance.state = EntityState.creating;
      instance.operationState = {
        operation: OperationType.creating,
        status: OperationStatus.processing,
      };
      await this.subDao!.createEntity(instance);

      session.data.replacementTargetId = instanceId;
      session = await this.sessionDao.updateEntity(session);
    } else {
      instance.operationState = {
        operation: OperationType.updating,
        status: OperationStatus.processing,
      };
      await this.subDao!.updateEntity(instance);
    }

    setImmediate(async () => {
      try {
        await this.persistTrunkSession(
          session as Model.ITrunkSession,
          masterSessionId,
          parentEntity,
          instance,
          instanceId
        );
      } catch (error) {
        console.log(error);
        const brokenInstance = await this.subDao!.getEntity(instance);
        brokenInstance.state =
          instance.state === Model.EntityState.creating ? Model.EntityState.invalid : brokenInstance.state;
        brokenInstance.operationState = {
          operation: instance.operationState!.operation,
          status: OperationStatus.failed,
        };
        await this.subDao!.updateEntity(brokenInstance);
      }
    });

    return instanceId;
  };

  protected persistTrunkSession = async (
    session: Model.ITrunkSession,
    masterSessionId: Model.ISubordinateId,
    parentEntity: Model.IEntity,
    instance: Model.IInstance,
    instanceId: string
  ): Promise<void> => {
    return RDS.inTransaction(async (daos) => {
      if (this.entityType !== Model.EntityType.integration) {
        throw new Error(`Invalid entity type '${this.entityType}' for ${masterSessionId.entityId}`);
      }

      const leafSessionResults: Record<string, any> = {};
      const leafTags: Model.ITags = {};

      // Persist each session.
      const leafPromises = await (Promise as any).allSettled(
        Object.values(session.data.components).map(async (step: Model.IStep) => {
          try {
            if (!step.childSessionId) {
              throw http_error(500, 'Missing child session id');
            }
            const sessionEntity = await this.sessionDao.getEntity({
              accountId: session.accountId,
              subscriptionId: session.subscriptionId,
              id: step.childSessionId,
            });
            Object.assign(leafTags, sessionEntity.tags);
            this.ensureSessionLeaf(sessionEntity, 'invalid session entry in step');

            const result = await this.persistLeafSession(
              daos,
              sessionEntity,
              masterSessionId,
              sessionEntity.data.entityId
            );

            // Store the results.
            leafSessionResults[step.name] = result.result;
          } catch (e) {
            // Force the transaction to fail.
            throw e;
          }
        })
      );

      // If a leaf specifically errored, report that first.
      Object.entries(leafSessionResults).forEach(([name, result]: [string, any]) => {
        if (result.error) {
          // An error occurred
          throw http_error(400, `Failed component '${name}': ${result.error} ${result.errorDescription || ''}`);
        }
      });

      // Otherwise, make sure everything else succeeded.
      leafPromises.forEach((result: { status: string; message: string }) => {
        if (result.status === 'rejected') {
          throw http_error(500, result.message);
        }
      });

      // Update instance operation state.
      instance.state = EntityState.active;
      instance.operationState = {
        operation: instance.operationState?.operation || OperationType.creating,
        status: OperationStatus.success,
      };

      // Grab up-to-date information to use as basis.
      const existingEntity = await this.subDao!.getEntity(instance);

      // Update instance tags.
      instance.tags = {
        ...existingEntity.tags,
        ...session.tags,
        'session.master': masterSessionId.entityId,
        ...leafTags,
        'fusebit.parentEntityId': parentEntity.id,
      };

      // Update instance with identity information.
      instance.data = { ...existingEntity.data, ...instance.data, ...leafSessionResults };

      const subDao = daos[this.subDao!.getDaoType()];
      await subDao.updateEntity(instance);

      // Record the successfully created instance in the master session.
      session.data.output = {
        ...session.data.output,
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        parentEntityType: this.entityType,
        parentEntityId: masterSessionId.parentEntityId,
        entityType: this.subDao!.getDaoType(),
        entityId: instanceId,
        tags: instance.tags,
      };
      await daos[Model.EntityType.session].updateEntity(session);
    });
  };

  public persistLeafSession = async (
    daos: Model.IDaoCollection,
    session: Model.ILeafSession,
    masterSessionId: Model.ISubordinateId,
    parentEntityId: string
  ): Promise<IServiceResult> => {
    if (session.data.entityType === Model.EntityType.integration || session.data.output?.error) {
      // Form output is supplied directly to the master instance, since it will be used by the integration
      // directly.
      //
      // This must change if forms from other integrations require their own isolation boundaries, but that's
      // not yet supported.
      //
      // If error is set on the output, it will cause a transaction failure.  The statusCode is ignored.
      return { statusCode: 400, result: session.data.output };
    }

    const service = this.connectorService;

    // Get the database ID to hang this subordinate object off of.
    const parentEntity = await daos[service.dao.getDaoType()].getEntity({
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: parentEntityId,
    });

    const leafId = session.data.replacementTargetId || uuidv4();

    const leafEntity: Model.IEntity = {
      accountId: session.accountId,
      subscriptionId: session.subscriptionId,
      id: Model.createSubordinateId(service.entityType, parentEntity.__databaseId as string, leafId),
      data: session.data.output || {},
      tags: { ...session.tags, 'session.master': masterSessionId.entityId, 'fusebit.parentEntityId': parentEntity.id },
    };

    const subDao = daos[service.subDao!.getDaoType()];
    if (!!session.data.replacementTargetId) {
      await subDao.updateEntity(leafEntity);
    } else {
      await subDao.createEntity(leafEntity);
    }

    return {
      statusCode: 200,
      result: {
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        parentEntityType: service.entityType,
        parentEntityId,
        entityType: service.subDao!.getDaoType(),
        entityId: leafId,
        tags: leafEntity.tags,
      },
    };
  };
}
