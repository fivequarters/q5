import { v4 as uuidv4 } from 'uuid';
import RDS, { Model } from '@5qtrs/db';

import BaseComponentService, { IServiceResult } from './BaseComponentService';

interface ISessionDetails {
  steps?: string[];
  tags?: Model.ITags;
  input?: { [stepName: string]: any };
  redirectUrl: string;
}

// TODO:
//  IIntegrationEntity:
//    // When does the integration code actually persist this into an instance? Probably just on the final
//    // callback after the commits for all of the steps have been performed. Need to incorporate a way to
//    // extract out the results of things like forms. Maybe anything without a commit url?
//    // Also, need to include in the top level the id of any artifacts created, so the top level integration
//    // code has a chance to associate.
//
//  On creation, allow for targeted override of the input object.
//
//  Call the commit url with an operationId so it can track rollback if necessary.
//  Record all of the results in the operation, key'ed off of the stepName.
//
export default abstract class SessionedComponentService<E extends Model.IEntity> extends BaseComponentService<E> {
  private readonly sessionDao: Model.IEntityDao<Model.ISession>;

  constructor(dao: Model.IEntityDao<E>) {
    super(dao);
    this.sessionDao = RDS.DAO.session;
  }

  // Note: members are only optional because req.params needs them to be.
  public createSessionId = (params: { entityType?: string; entityId?: string; sessionId?: string }) => {
    // XXX Check table schema for entity.id.
    // Some cheap hash might be necessary if this exceeds the table id length
    return `/${params.entityType || this.entityType}/${params.entityId}/${params.sessionId}`;
  };

  public createSession = async (
    entity: Model.IEntity,
    sessionDetails: ISessionDetails | Model.IStep
  ): Promise<IServiceResult> => {
    if ('target' in sessionDetails) {
      // Explicit step session creation.
      return this.createStepSession(
        { ...entity, entityType: this.entityType, entityId: entity.id },
        undefined,
        sessionDetails
      );
    }

    // Load the entity from entity.entityId
    const component = await this.dao.getEntity(entity);

    // Get the steps, or intuit them based on connectors specified.
    let stepList: string[];
    let steps: { [stepName: string]: Model.IStep } = {};
    let tags: Model.ITags;
    const sessionId = uuidv4();

    if (component.data.creation) {
      // Present in the component; use as specified.
      stepList = Object.keys(steps);
      steps = component.data.creation.steps;
    } else {
      stepList = [];
      // Not present; deduce from configuration elements.
      Object.keys(component.data.configuration?.connectors).forEach((connectorId) => {
        const stepName = `connector:${connectorId}`;
        stepList.push(stepName);
        steps[stepName] = {
          stepName,
          target: {
            type: Model.EntityType.connector,
            accountId: component.accountId,
            subscriptionId: component.subscriptionId,
            entityId: connectorId,
          },
        };
      });
    }

    // If there's a specific order or subset specified, use that instead of the full list.
    if (sessionDetails.steps) {
      stepList = stepList.filter((stepName) => sessionDetails.steps?.includes(stepName));
    }

    // If there's any additional input or uses parameters, include those in the specification.
    if (sessionDetails.input) {
      Object.keys(sessionDetails.input).forEach((stepName: string) => {
        // Thanks typescript.
        if (sessionDetails.input) {
          steps[stepName].input = sessionDetails.input[stepName];
        }
      });
    }

    tags = (sessionDetails.tags ? sessionDetails.tags : component.data.creation?.tags) || {};
    tags['fusebit.sessionId'] = sessionId;

    // Validate DAG of 'uses' parameters, if any - this should happen also in component creation.
    const dagSteps: string[] = [];
    stepList.forEach((stepName) => {
      dagSteps.push(stepName);
      steps[stepName].uses?.forEach((usesStep) => {
        if (!dagSteps.includes(usesStep)) {
          throw new Error(`Ordering violation: 'uses' in '${stepName}' for '${usesStep}' before declaration.`);
        }
      });
    });

    // Create a session object that's structured appropriately.
    const session: Model.ISession = {
      accountId: entity.accountId,
      subscriptionId: entity.subscriptionId,
      id: this.createSessionId({ entityId: entity.id, sessionId }),
      data: {
        mode: 'step',
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

  public createStepSession = async (
    params: { accountId: string; subscriptionId: string; entityType: string; entityId: string },
    reference: { redirectUrl: string } | { parentId: string } | undefined,
    step: Model.IStep
  ): Promise<IServiceResult> => {
    // Create a new session.
    const session: Model.ISession = {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      id: this.createSessionId({ ...params, sessionId: uuidv4() }),
      data: {
        mode: 'leaf',
        stepName: step.stepName,
        input: step.input,
        output: step.output,
        target: step.target,
        meta: reference || {},
      },
    };

    await this.sessionDao.createEntity(session);

    return { statusCode: 200, result: session };
  };

  // XXX To be continued below
  public getSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    return { statusCode: 200, result: session };
  };

  public putSession = async (entity: Model.IEntity, values: any): Promise<IServiceResult> => {
    // Write the contents into the session, return the new session details.
    return { statusCode: 200, result: {} };
  };

  public startSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Look at the steps, determine the first entrypoint.  Create a session for it, dispatch to the specified
    // configuration endpoint by returning a 302 to that url.
    return { statusCode: 200, result: {} };
  };

  public finishSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Return a 302 back to the parentId or the redirectUri if no parentId.
    return { statusCode: 200, result: {} };
  };

  public postSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Return an operation for creating all of the subsidiary objects.
    return { statusCode: 200, result: {} };
  };

  // Called on multiple different SessionedComponentService objects to instantiate sub-sessions as necessary,
  // with each individual session data packet supplied as the entity.
  public instantiateSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Create a new instance/identity based on the data included in entity.data.
    return { statusCode: 200, result: {} };
  };
}
