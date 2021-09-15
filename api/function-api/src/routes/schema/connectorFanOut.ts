import { ConnectorService, InstanceService, IntegrationService } from '../service';
import { Model } from '@5qtrs/db';
import express from 'express';
import query from '../handlers/query';
import { getAuthToken } from '@5qtrs/constants';
import pathParams from '../handlers/pathParams';

enum AllSettledStatus {
  Fulfilled = 'fulfilled',
  Rejected = 'rejected',
}
interface IFulfilled {
  status: AllSettledStatus.Fulfilled;
  value: any;
}
interface IRejected {
  status: AllSettledStatus.Rejected;
  reason: any;
}
type AllSettledResult = (IFulfilled | IRejected)[];

const router = (
  connectorService: ConnectorService,
  integrationService: IntegrationService,
  instanceService: InstanceService
) => {
  const fanOutRouter = express.Router({ mergeParams: true });
  fanOutRouter.route('/:entityId/fan_out/:subPath(*)').post(async (req, res) => {
    const instances: Model.IInstance[] = [];
    let next = '0';

    console.log(`fanout body: ${JSON.stringify(req.body)}`);
    do {
      const instanceResponse = await instanceService.dao.listEntities(
        {
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          ...query.tag(req),
          idPrefix: `/integration/`,
        },
        {
          next,
        }
      );
      instances.push(...instanceResponse.items);
      next = instanceResponse.next || '';
    } while (next);

    const instancesByIntegrationId = instances.reduce<Record<string, string[]>>((acc, cur) => {
      const integrationId = cur.tags?.['fusebit.parentEntityId'];
      if (!integrationId) {
        return acc;
      }

      if (!acc[integrationId]) {
        acc[integrationId] = [];
      }
      acc[integrationId].push(cur.id.split('/')[3]);
      return acc;
    }, {});

    const dispatch = getDispatchToIntegration(req);

    const dispatchResponses: AllSettledResult = await (Promise as typeof Promise & {
      allSettled: Function;
    }).allSettled(
      Object.entries(instancesByIntegrationId).map(async ([integrationId, instanceIds]) => {
        const result = await dispatch(integrationId, instanceIds);
        console.log(
          `result ${integrationId} ${JSON.stringify(instanceIds)}: ${req.params.subPath}`,
          JSON.stringify(req.body),
          result
        );
        return result;
      })
    );

    const fullSuccess = dispatchResponses.every(
      (response) => response.status === AllSettledStatus.Fulfilled && response.value.code < 300
    );

    if (fullSuccess) {
      res.status(200);
    } else {
      res.status(500);
    }
    res.send(dispatchResponses);
  });

  const getDispatchToIntegration = (req: express.Request) => (integrationId: string, instanceIds: string[]) => {
    console.log(`dispatch: ${req.method} /${req.params.subPath} ${JSON.stringify({...req.body, instanceIds})}`);
    integrationService.dispatch(
      {
        ...pathParams.EntityById(req),
        id: integrationId,
      },
      req.method,
      `/${req.params.subPath}`,
      {
        token: getAuthToken(req),
        headers: req.headers,
        body: {
          ...req.body,
          instanceIds,
        },
        query: req.query,
        originalUrl: req.originalUrl,
      }
    );

  return fanOutRouter;
};

export default router;
