import { BaseEntityService } from '../service';
import express from 'express';
import pathParams from './pathParams';

const requestToEntity = async (
  EntityService: BaseEntityService<any, any>,
  paramIdNames: string[],
  req: express.Request,
  ...additionalAttributes: Record<string, any>[]
) => {
  const stripUndefined = (obj: Record<string, any>) => {
    Object.entries(obj).forEach(([key, value]) => {
      if (value === undefined) {
        delete obj[key];
      }
    });
    return obj;
  };
  return Object.assign(
    await EntityService.loadDependentEntities(
      ...paramIdNames.map((paramIdName) => pathParams.EntityById(req, paramIdName))
    ),
    ...additionalAttributes.map(stripUndefined)
  );
};

export default requestToEntity;
