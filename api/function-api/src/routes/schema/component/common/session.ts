import express from 'express';

import { SessionedComponentService } from '../../../service/components/';

const createSessionRouter = (SessionService: SessionedComponentService<any>) => {
  const router = express.Router({ mergeParams: true });

  router.post('/', async (req, res, next) => {
    try {
      const session = await SessionService.createSession(
        {
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: req.params.entityId,
        },
        req.body
      );
      res.status(session.statusCode).json(session.result);
    } catch (error) {
      return next(error);
    }
  });

  //  Get full value of session.
  router.route('/result/:sessionId').get(async (req, res, next) => {
    try {
      const session = await SessionService.getSession({
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        id: SessionService.createSessionId(req.params),
      });
      const result = {
        id: req.params.sessionId,
        input: session.result.input,
        output: session.result.output,
        steps: session.result.output,
      };
      res.status(session.statusCode).json(result);
    } catch (error) {
      return next(error);
    }
  });

  // Get 'public' value of session
  router
    .route('/:sessionId')
    .get(async (req, res, next) => {
      try {
        const session = await SessionService.getSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: SessionService.createSessionId(req.params),
        });
        const result = { id: req.params.sessionId, input: session.result.input };
        res.status(session.statusCode).json(result);
      } catch (error) {
        return next(error);
      }
    })
    .put(async (req, res, next) => {
      try {
        const session = await SessionService.putSession(
          {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: SessionService.createSessionId(req.params),
          },
          req.body
        );
        res.status(session.statusCode).json(session.result);
      } catch (error) {
        return next(error);
      }
    })
    .post(async (req, res, next) => {
      try {
        const operation = await SessionService.postSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: `${req.params.entityId}-${req.params.sessionId}`,
        });
        res.status(operation.statusCode).json(operation.result);
      } catch (error) {
        return next(error);
      }
    });

  router.get('/:sessionId/start', async (req, res, next) => {
    try {
      const { result: redirectUrl } = await SessionService.startSession({
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        id: `${req.params.entityId}-${req.params.sessionId}`,
      });
      return res.redirect(redirectUrl);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:sessionId/callback', async (req, res, next) => {
    try {
      const { result: redirectUrl } = await SessionService.finishSession({
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        id: SessionService.createSessionId(req.params),
      });
      return res.redirect(redirectUrl);
    } catch (error) {
      return next(error);
    }
  });
  return router;
};

export default createSessionRouter;
