import { IncomingHttpHeaders } from 'http';

import RDS, { Model } from '@5qtrs/db';

import * as Functions from '../../functions';
import { isArray } from '@5qtrs/type';
import createError from 'http-errors';
import { ISessionConfig, ISession, ISessionStep, SessionStepStatus } from '@5qtrs/db/libc/model';
import { ISessionIdParams } from '../../handlers/pathParams';
import uuidv4 from 'uuid/v4';
import superagent from 'superagent';

export interface IServiceResult {
  statusCode: number;
  contentType?: string;
  result: any;
}

export interface IDispatchParams {
  headers: IncomingHttpHeaders;
  body?: string | object;
  query?: object;
  originalUrl: string;
}

export interface IEntityWithStepId extends Model.IEntity {
  stepSessionId: string;
  stepName?: string;
}

export interface IEntityWithStep extends Model.IEntity {
  stepSessionId?: string;
  stepName: string;
}

export default abstract class BaseComponentService<E extends Model.IEntity> {
  public abstract readonly entityType: Model.EntityType;
  protected constructor(dao: Model.IEntityDao<E>) {
    this.dao = dao;
  }
  public readonly dao: Model.IEntityDao<E>;

  public createEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.createEntity(entity),
  });
  public updateEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.updateEntity(entity),
  });
  public deleteEntity = async (entity: Model.IEntity): Promise<IServiceResult> => ({
    statusCode: 200,
    result: await this.dao.deleteEntity(entity),
  });

  public getEntityTag = async (entityKey: Model.IEntityKeyTagSet): Promise<string> => {
    const response = await this.dao.getEntityTags(entityKey);
    return response.tags[entityKey.tagKey];
  };

  public dispatch = async (
    entity: Model.IEntity,
    method: string,
    path: string,
    elements: IDispatchParams
  ): Promise<Functions.IExecuteFunction> => {
    return Functions.executeFunction(
      { ...entity, boundaryId: this.entityType, functionId: entity.id, version: undefined },
      method,
      path,
      elements
    );
  };

  public health = ({ id }: { id: string }): Promise<boolean> => {
    return Promise.resolve(false);
  };

  public getNextSessionStep = async (entity: Model.IEntity): Promise<ISession> => {
    const session = await RDS.DAO.session.getEntity(entity);

    if (session.data && session.data.steps && isArray(session.data.steps)) {
      throw createError(500);
    }

    const nextStep = session.data.steps.find((step: ISessionStep) => step.status !== SessionStepStatus.COMPLETE);
    return { ...session, nextStep };
  };

  public getSessionStep = async (entity: IEntityWithStep): Promise<ISessionStep> => {
    const session = await RDS.DAO.session.getEntity(entity);
    if (
      session.data &&
      session.data.steps &&
      isArray(session.data.steps) &&
      session.data.steps.some((step) => step.name === entity.stepName)
    ) {
      throw createError(500);
    }

    const sessionStep = session.data.steps.find((step) => step.name === entity.stepName) as ISessionStep;

    if (!sessionStep.id) {
      const sessionCreateResponse = await superagent.post(sessionStep.config.url).send(sessionStep.config);
      await this.beginSessionStep({
        ...session,
        stepName: sessionStep.name,
        stepSessionId: sessionCreateResponse.body.sessionId,
      });
    }

    return sessionStep;
  };

  public getSession = async (entity: Model.IEntity): Promise<ISession> => {
    return await RDS.DAO.session.getEntity(entity);
  };

  public createSession = async (sessionIdParams: ISessionIdParams, config: ISessionConfig): Promise<any> => {
    const entity = await this.dao.getEntity({ ...sessionIdParams, id: config.entityId });
    await RDS.DAO.session.createEntity({
      id: uuidv4(),
      accountId: sessionIdParams.accountId,
      subscriptionId: sessionIdParams.subscriptionId,
      data: {
        parentSessionId: sessionIdParams.parentSessionId,
        configuration: {
          ...entity.data.configuration,
          ...config,
        },
      },
    });
  };

  public updateSessionStepStatus = async (
    sessionParams: IEntityWithStep | IEntityWithStepId,
    status: SessionStepStatus
  ): Promise<ISession> => {
    const session = await RDS.DAO.session.getEntity(sessionParams);
    if (
      session.data &&
      session.data.steps &&
      isArray(session.data.steps) &&
      session.data.steps.some((step) => step.name === sessionParams.stepName)
    ) {
      throw createError(500);
    }

    let sessionStep: ISessionStep;
    if (sessionParams.stepSessionId) {
      sessionStep = session.data.steps.find((step) => step.id === sessionParams.id) as ISessionStep;
      if (sessionStep.id && sessionStep.id !== sessionParams.stepSessionId) {
        // cleanup orphaned sessions
        await RDS.DAO.session.deleteEntity({ ...sessionParams, id: sessionStep.id });
      }
      sessionStep.id = sessionParams.stepSessionId;
    } else {
      sessionStep = session.data.steps.find((step) => step.name === sessionParams.stepName) as ISessionStep;
    }

    sessionStep.status = status;

    return await RDS.DAO.session.updateEntity(session);
  };

  public beginSessionStep = async (sessionParams: IEntityWithStep | IEntityWithStepId): Promise<any> => {
    return await this.updateSessionStepStatus(sessionParams, SessionStepStatus.IN_PROGRESS);
  };

  public completeSessionStep = async (sessionParams: IEntityWithStep | IEntityWithStepId): Promise<any> => {
    return await this.updateSessionStepStatus(sessionParams, SessionStepStatus.COMPLETE);
  };
}
