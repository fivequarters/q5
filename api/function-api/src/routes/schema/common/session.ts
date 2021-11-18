import express from 'express';

import * as Constants from '@5qtrs/constants';
import { Model } from '@5qtrs/db';
import { v2Permissions } from '@5qtrs/constants';

import * as common from '../../middleware/common';
import { SessionedEntityService } from '../../service';
import * as Validation from '../../validation/session';
import * as ValidationCommon from '../../validation/entities';

const createSessionRouter = (SessionService: SessionedEntityService<any, any>) => {
  const router = express.Router({ mergeParams: true });

  router.options('/', common.cors());
  router.post(
    '/',
    common.management({
      validate: { params: ValidationCommon.EntityIdParams, body: Validation.SessionCreate },
      authorize: { operation: v2Permissions.addSession },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const session = await SessionService.createSession(
          {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          },
          req.body
        );

        const sessionId = Model.decomposeSubordinateId(session.result.id).entityId;
        res.status(session.statusCode).json({
          ...Model.entityToSdk(session.result),
          id: sessionId,
          targetUrl: `${Constants.API_PUBLIC_ENDPOINT}/v2/account/${req.params.accountId}/subscription/${req.params.subscriptionId}/${SessionService.entityType}/${req.params.entityId}/session/${sessionId}/start`,
        });
      } catch (error) {
        console.log(error);
        return next(error);
      }
    }
  );

  router
    .route('/:sessionId')
    .options(common.cors())
    // Get 'public' value of session
    .get(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        authorize: { operation: v2Permissions.getSession },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const session = await SessionService.getSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });
          const result = {
            id: req.params.sessionId,
            input: session.result.data.input,
            output: session.result.data.output,
            dependsOn: session.result.data.dependsOn,
            tags: session.result.tags,
          };
          res.status(session.statusCode).json(result);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    )
    // Write to the 'output' of the session.
    .put(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams, body: Validation.SessionPut },
        authorize: { operation: v2Permissions.updateSession },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const session = await SessionService.putSession(
            {
              accountId: req.params.accountId,
              subscriptionId: req.params.subscriptionId,
              id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
            },
            req.body
          );
          const result = {
            id: req.params.sessionId,
            input: session.result.input,
            output: session.result.output,
            dependsOn: session.result.dependsOn,
            tags: session.result.tags,
          };
          res.status(session.statusCode).json(result);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  router.options('/:sessionId/start', common.cors());
  router
    // Get a new session and a 302 redirect url for the first step.
    .get(
      '/:sessionId/start',
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        // No auth: called by the browser to start a session, and be redirected to the next endpoint.
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { result } = await SessionService.startSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });

          // Send the browser to the configured handler url with the sessionid as a query parameter,
          // or back to the final redirect in case there are no components to run through in the session
          const redirectUrl =
            result.url ||
            `${Constants.API_PUBLIC_ENDPOINT}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}${result.path}?session=${result.sessionId}&redirect_uri=${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}/session/${result.sessionId}/callback`;
          return res.redirect(redirectUrl);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  router.options('/:sessionId/callback', common.cors());
  router
    // Finish a session and get the next component's redirect url.
    .get(
      '/:sessionId/callback',
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        // No auth: called by the browser to indicate completion of a session, and to be dispatched to the next
        // endpoint.
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { result } = await SessionService.finishSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });

          if (result.mode === 'url') {
            // Session is complete - send to final redirectUrl.
            return res.redirect(result.url);
          }

          // Send the browser to start the next session.
          const redirectUrl = `${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}${result.path}?session=${result.sessionId}`;
          return res.redirect(redirectUrl);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  router
    .route('/:sessionId/commit')
    .options(common.cors())
    // Commit the session, creating all of the appropriate artifacts
    .post(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        authorize: { operation: v2Permissions.commitSession },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const installId = await SessionService.commitSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            // Sessions use the non-unique component name, but installs and identities use the database id.
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });
          res.status(202).json({
            targetUrl: `${Constants.API_PUBLIC_ENDPOINT}/v2/account/${req.params.accountId}/subscription/${req.params.subscriptionId}/${SessionService.entityType}/${req.params.entityId}/install/${installId}/`,
          });
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  return router;
};

export default createSessionRouter;
