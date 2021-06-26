import { BaseComponentService } from '../service';
import express from 'express';
import pathParams from './pathParams';

const requestToEntity = async (
  ComponentService: BaseComponentService<any, any>,
  paramIdNames: string[],
  req: express.Request,
  ...additionalAttributes: Record<string, any>[]
) =>
  Object.assign(
    await ComponentService.loadDependentEntities(
      ...paramIdNames.map((paramIdName) => pathParams.EntityById(req, paramIdName))
    ),
    ...additionalAttributes
  );

export default requestToEntity;
