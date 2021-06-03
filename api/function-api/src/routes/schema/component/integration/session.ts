import express from 'express';
import { IntegrationService } from '../../../service';
import query from '../../../handlers/query';
import pathParams from '../../../handlers/pathParams';
import RDS from '@5qtrs/db';
import * as url from 'url';
import body from '../../../handlers/body';

const router = (IntegrationService: IntegrationService) => {
  const componentSessionRouter = express.Router({ mergeParams: true });

  componentSessionRouter.post('/', async (req, res, next) => {
    // Verify config coalesce

    // Check for InstanceId

    // return session Id

    const sessionRedirect = query.sessionRedirect(req);
    // save redirectUrl for final redirect, not here
    const session = await RDS.DAO.Session.createEntity({
      ...pathParams.EntityById(req),
      ...body.entity(req),
    });
    const redirectUrl = url.format({
      pathname: sessionRedirect.redirectUrl as string,
      query: {
        sessionId: session.id,
      },
    });
    // return as json, not redirect
    res.redirect(redirectUrl);
  });

  // Get value of session
  componentSessionRouter
    .route('/:sessionId')
    .get(async (req, res, next) => {
      const session = await RDS.DAO.Session.getEntity({
        ...pathParams.SessionId(req),
      });
      res.json(session);
    })
    .put(async (req, res, next) => {
      const session = await RDS.DAO.Session.updateEntity({
        ...pathParams.SessionId(req),
        ...body.entity(req),
      });
      res.json(session);
    });

  return componentSessionRouter;
};

export default router;
