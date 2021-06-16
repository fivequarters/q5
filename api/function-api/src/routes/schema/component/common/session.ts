import express from 'express';

import * as common from '../../../middleware/common';
import { SessionedComponentService } from '../../../service/components/';
import * as Validation from '../../../validation/session';

const createSessionRouter = (SessionService: SessionedComponentService<any>) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    common.management({ validate: { body: Validation.SessionCreate } }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const session = await SessionService.createSession(
          {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.componentId,
          },
          req.body
        );
        res
          .status(session.statusCode)
          .json({ ...session.result, id: SessionService.extractSessionId(session.result.id) });
      } catch (error) {
        console.log(error);
        return next(error);
      }
    }
  );

  //  Get full value of session.
  router.route('/result/:sessionId').get(async (req, res, next) => {
    try {
      const session = await SessionService.getSession({
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        id: SessionService.createSessionId(req.params as any),
      });
      let result: any = {
        id: req.params.sessionId,
        input: session.result.data.input,
        output: session.result.data.output,
        steps: session.result.data.steps,
      };

      if (session.result.data.mode === 'leaf') {
        result = {
          ...result,
          target: session.result.data.target,
          stepName: session.result.data.stepName,
        };
      }
      res.status(session.statusCode).json(result);
    } catch (error) {
      console.log(error);
      return next(error);
    }
  });

  router
    .route('/:sessionId')
    // Get 'public' value of session
    .get(async (req, res, next) => {
      try {
        const session = await SessionService.getSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: SessionService.createSessionId(req.params as any),
        });
        const result = { id: req.params.sessionId, input: session.result.data.input };
        res.status(session.statusCode).json(result);
      } catch (error) {
        console.log(error);
        return next(error);
      }
    })
    // Write to the 'output' of the session.
    .put(async (req, res, next) => {
      try {
        const session = await SessionService.putSession(
          {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: SessionService.createSessionId(req.params as any),
          },
          req.body
        );
        const result = { id: req.params.sessionId, input: session.result.input };
        res.status(session.statusCode).json(result);
      } catch (error) {
        console.log(error);
        return next(error);
      }
    })
    // Commit the session, creating all of the appropriate artifacts
    .post(async (req, res, next) => {
      try {
        const operation = await SessionService.postSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: SessionService.createSessionId(req.params as any),
        });
        res.status(operation.statusCode).json(operation.result);
      } catch (error) {
        console.log(error);
        return next(error);
      }
    });

  router
    // Get a new session and a 302 redirect url for the first step.
    .get('/:sessionId/start', async (req, res, next) => {
      try {
        const { result } = await SessionService.startSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: SessionService.createSessionId(req.params as any),
        });
        if (typeof result === 'string') {
          return res.redirect(result);
        } else {
          const redirectUrl = `${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}/api/start?session=${result.sessionId}`;
          return res.redirect(redirectUrl);
        }
      } catch (error) {
        console.log(error);
        return next(error);
      }
    });

  router
    // Finish a session and get the final redirect url.
    .get('/:sessionId/callback', async (req, res, next) => {
      try {
        const { result } = await SessionService.finishSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: SessionService.createSessionId(req.params as any),
        });
        if (typeof result === 'string') {
          return res.redirect(result);
        } else {
          const redirectUrl = `${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}/api/start?session=${result.sessionId}`;
          return res.redirect(redirectUrl);
        }
      } catch (error) {
        console.log(error);
        return next(error);
      }
    });

  return router;
};

export default createSessionRouter;
