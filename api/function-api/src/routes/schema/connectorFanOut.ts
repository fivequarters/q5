import { ConnectorService, InstanceService, IntegrationService } from '../service';

import { v2Permissions, getAuthToken } from '@5qtrs/constants';
import { Model } from '@5qtrs/db';

import * as fanOutValidate from '../validation/fanOut';
import express from 'express';
import query from '../handlers/query';
import pathParams from '../handlers/pathParams';

import * as common from '../middleware/common';

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

export interface IWebhookEvent {
  data: any;
  eventType: string;
  entityId: string;
  webhookEventId: string;
  webhookAuthId: string;
}
export type IWebhookEvents = IWebhookEvent[];

const router = (
  connectorService: ConnectorService,
  integrationService: IntegrationService,
  instanceService: InstanceService
) => {
  const fanOutRouter = express.Router({ mergeParams: true });
  fanOutRouter.route('/:entityId/fan_out/:subPath(*)').post(
    common.management({
      validate: { query: fanOutValidate.fanOutQuery, body: fanOutValidate.fanOutBody },
      authorize: { operation: v2Permissions[Model.EntityType.connector].get },
    }),
    async (req: express.Request, res: express.Response) => {
      const instances: Model.IInstance[] = [];
      let next = '0';

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

      if (instances.length === 0 && req.query.default) {
        // No instances identified; send to the default target with an invalid instanceId of all 0's
        instancesByIntegrationId[req.query.default as string] = ['00000000-0000-0000-0000-000000000000'];
      }

      const dispatch = getDispatchToIntegration(req);

      const dispatchResponses: AllSettledResult = await (Promise as typeof Promise & {
        allSettled: Function;
      }).allSettled(
        Object.entries(instancesByIntegrationId).map(async ([integrationId, instanceIds]) =>
          dispatch(integrationId, instanceIds)
        )
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
    }
  );

  const getDispatchToIntegration = (req: express.Request) => (integrationId: string, instanceIds: string[]) =>
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
          payload: req.body.payload.map((event: IWebhookEvents) => ({ ...event, instanceIds })),
        },
        query: req.query,
        originalUrl: req.originalUrl,
      }
    );

  return fanOutRouter;
};

export default router;
