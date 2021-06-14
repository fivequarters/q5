import { v4 as uuidv4 } from 'uuid';
import RDS, { Model } from '@5qtrs/db';

import BaseComponentService, { IServiceResult } from './BaseComponentService';

export default abstract class SessionedComponentService<E extends Model.IEntity> extends BaseComponentService<E> {
  private readonly sessionDao: Model.IEntityDao<Model.ISession>;

  constructor(dao: Model.IEntityDao<E>) {
    super(dao);
    this.sessionDao = RDS.DAO.session;
  }

  // Note: members are only optional because req.params needs them to be.
  public createSessionId = (params: { entityType: string; componentId: string; sessionId: string }) => {
    return `/${params.entityType || this.entityType}/${params.componentId}/${params.sessionId}`;
  };

  public extractSessionId = (id: string): string => {
    return id.split('/').pop() as string;
  };

  public extractComponentId = (id: string): string => {
    const comps = id.split('/');
    comps.pop();
    return comps.pop() as string;
  };

  public getTargetUrl = (params: Model.IEntity, step: Model.IStep) => {
    if (step.target.type === 'generic') {
      return step.target.handlers.step;
    }
    return {
      accountId: params.accountId,
      subscriptionId: params.subscriptionId,
      entityType: 'connector',
      entityId: this.extractComponentId(params.id),
      sessionId: this.extractSessionId(params.id),
      ...step.target,
    };
    return step.target;
  };

  public createSession = async (
    entity: Model.IEntity,
    sessionDetails: Model.ISessionParameters | Model.IStep
  ): Promise<IServiceResult> => {
    if ('target' in sessionDetails) {
      console.log(`createSession stepSession`, { ...entity, entityType: this.entityType, componentId: entity.id });
      // Explicit step session creation.
      return this.createStepSession(
        { ...entity, entityType: this.entityType, componentId: entity.id },
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

    if (component.data.configuration.creation) {
      // Present in the component; use as specified.
      steps = component.data.configuration.creation.steps;
      stepList = Object.keys(steps);
    } else {
      stepList = [];
      // Not present; deduce from configuration elements.
      Object.keys(component.data.configuration?.connectors).forEach((connectorLabel) => {
        const connectorId = component.data.configuration.connectors[connectorLabel].connector;
        const stepName = `connector:${connectorLabel}`;
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

    console.log(`createSession early`, steps, stepList, sessionDetails.steps);

    // If there's a specific order or subset specified, use that instead of the full list.
    if (sessionDetails.steps) {
      stepList = stepList.filter((stepName) => sessionDetails.steps?.includes(stepName));
    }

    // If there's any additional input or uses parameters, include those in the specification.
    if (sessionDetails.input) {
      Object.keys(sessionDetails.input).forEach((stepName: string) => {
        // Thanks typescript.
        if (sessionDetails.input && steps[stepName]) {
          steps[stepName].input = sessionDetails.input[stepName];
        }
      });
    }

    tags = (sessionDetails.tags ? sessionDetails.tags : component.data.configuration.creation?.tags) || {};
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
      id: this.createSessionId({ ...entity, entityType: this.entityType, componentId: entity.id, sessionId }),
      data: {
        mode: 'step',
        steps: stepList.map((stepName: string) => ({ ...steps[stepName], stepName })),
        meta: {
          redirectUrl: sessionDetails.redirectUrl,
        },
      },
    };

    console.log(`createSession`, JSON.stringify(session, null, 2));
    // Write the session object.
    return {
      statusCode: 200,
      result: await this.sessionDao.createEntity(session),
    };
  };

  public createStepSession = async (
    params: { accountId: string; subscriptionId: string; entityType: string; componentId: string },
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

    console.log(`createStepSession`, JSON.stringify(session, null, 2));

    await this.sessionDao.createEntity(session);

    return { statusCode: 200, result: session };
  };

  public getSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    const session = await this.sessionDao.getEntity(entity);
    return { statusCode: 200, result: session };
  };

  public putSession = async (entity: Model.IEntity, outputValues: any): Promise<IServiceResult> => {
    // Write the contents into the session, return the new session details.
    let session = await this.sessionDao.getEntity(entity);
    session.data.output = outputValues;
    console.log('putSession', JSON.stringify(session, null, 2));
    session = await this.sessionDao.updateEntity(session);
    return { statusCode: 200, result: session };
  };

  public startSession = async (entity: Model.IEntity): Promise<IServiceResult> => {
    // Get the specified session.
    const session = await this.sessionDao.getEntity(entity);

    // If there's a target, then dispatch to that entrypoint
    if (session.data.mode === 'leaf') {
      // XXX correctly create url; placeholder.
      return { statusCode: 302, result: session.data.target.type };
    }

    if (!session.data.steps || session.data.steps.length === 0) {
      return { statusCode: 302, result: session.data.meta.redirectUrl };
    }

    // Get the first step
    const step = session.data.steps[0];

    // Create a session
    const stepSession = await this.createStepSession(
      {
        accountId: session.accountId,
        subscriptionId: session.subscriptionId,
        ...(step.target.type === 'connector'
          ? { entityType: 'connector', componentId: step.target.entityId }
          : { entityType: this.entityType, componentId: this.extractComponentId(session.id) }),
      },
      { parentId: this.extractSessionId(session.id) },
      step
    );

    console.log(`startSession`, JSON.stringify(stepSession, null, 2));
    // Return a 302 to the new session target
    return { statusCode: 302, result: this.getTargetUrl(stepSession.result, stepSession.result.data) };
  };

  // XXX undone below
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
