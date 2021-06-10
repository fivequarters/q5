import express from 'express';
import { BaseComponentService } from '../../../service';
import pathParams from '../../../handlers/pathParams';
import queryString from 'querystring';
import query from '../../../handlers/query';

const router = (ComponentService: BaseComponentService<any>) => {
  const sessionRouter = express.Router({ mergeParams: true });

  sessionRouter.post('/', async (req, res, next) => {
    try {
      const PathParams = pathParams.EntityById(req);
      const session = await ComponentService.createSession(
        {
          accountId: PathParams.accountId,
          subscriptionId: PathParams.subscriptionId,
        },
        { entityId: PathParams.id, ...req.body }
      );
      return res.json({ sessionId: session.id });
    } catch (e) {
      next(e);
    }
  });

  // Get value of session
  sessionRouter.route('/:sessionId').get(async (req, res, next) => {
    try {
      const sessionParams = pathParams.SessionId(req);
      const session = await ComponentService.getSession(sessionParams);
      return res.json(session);
    } catch (e) {
      next(e);
    }
  });

  sessionRouter.route('/:sessionId/next').get(async (req, res, next) => {
    try {
      const sessionParams = pathParams.SessionId(req);
      const sessionWithNextStep = await ComponentService.getNextSessionStep(sessionParams);

      if (sessionWithNextStep.nextStep) {
        // redirect to next step
        const redirectUrlArray = req.url.split('/');
        redirectUrlArray.pop();
        redirectUrlArray.push(sessionWithNextStep.nextStep.name);
        const redirectUrl = redirectUrlArray.join('/');
        return res.redirect(302, redirectUrl);
      } else {
        // redirect to callback url with sessionId encoded as parameter
        const queryParams = queryString.stringify(query.encodeSessionStep(sessionWithNextStep.id));
        const redirectUrl = `${sessionWithNextStep.data.redirectUrl}?${queryParams}`;
        return res.redirect(302, redirectUrl);
      }
    } catch (e) {
      next(e);
    }
  });

  sessionRouter.route('/:sessionId/callback').get(async (req, res, next) => {
    try {
      const sessionParams = pathParams.SessionId(req);
      const { sessionId } = query.decodeSessionStep(req);
      // mark step complete, if sessionId provided
      if (sessionId) {
        await ComponentService.completeSessionStep({ ...sessionParams, stepSessionId: sessionId });
      }
      const urlArray = req.url.split('/');
      urlArray.pop();
      urlArray.push('next');
      const redirectUrl = urlArray.join('/');
      res.redirect(302, redirectUrl);
    } catch (e) {
      next(e);
    }
  });

  sessionRouter.route('/:sessionId/:stepName').get(async (req, res, next) => {
    try {
      const sessionParams = pathParams.SessionStep(req);

      if (sessionParams.stepName.split(':')[0].toLowerCase() === ComponentService.entityType) {
        // delegate to integration/connector, passing the redirect URL as follows:
        const session = await ComponentService.getSession(sessionParams);
        const redirectUrl = session.data.redirectUrl;
        // TODO
        // Returning teapot for testing current status
        res.status(418);
        res.end();
        return;
      } else {
        // get sub-session and redirect to it
        const subSessionRedirectUrlArray = req.url.split('/');
        subSessionRedirectUrlArray.pop();
        subSessionRedirectUrlArray.push('/callback');
        const subSessionRedirectUrl = subSessionRedirectUrlArray.join('/');
        const sessionStep = await ComponentService.getSessionStep(sessionParams, subSessionRedirectUrl);

        const urlArray = req.url.split('/');
        urlArray.splice(urlArray.length - 4, 4);
        urlArray.push(...sessionStep.name.split(':'), <string>sessionStep.id);
        const redirectUrl = urlArray.join('/');
        return res.redirect(302, redirectUrl);
      }
    } catch (e) {
      next(e);
    }
  });

  return sessionRouter;
};

export default router;
