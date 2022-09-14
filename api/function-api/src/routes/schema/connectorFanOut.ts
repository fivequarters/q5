import { ConnectorService, InstallService, IntegrationService } from '../service';

import { v2Permissions, getAuthToken, makeTraceSpanId } from '@5qtrs/constants';
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
  installIds?: string[];
}
export type IWebhookEvents = IWebhookEvent[];

const router = (
  connectorService: ConnectorService,
  integrationService: IntegrationService,
  installService: InstallService
) => {
  const fanOutRouter = express.Router({ mergeParams: true });
  fanOutRouter.route('/:entityId/fan_out/:subPath(*)').post(
    common.management({
      validate: { query: fanOutValidate.fanOutQuery, body: fanOutValidate.fanOutBody },
      authorize: { operation: v2Permissions[Model.EntityType.connector].get },
    }),
    async (req: express.Request, res: express.Response) => {
      const installs: Model.IInstall[] = [];
      let next = '0';

      do {
        const installResponse = await installService.dao.listEntities(
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
        installs.push(...installResponse.items);
        next = installResponse.next || '';
      } while (next);

      const installsByIntegrationId = installs.reduce<Record<string, string[]>>((acc, cur) => {
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

      if (installs.length === 0 && req.query.default) {
        // No installs identified; send to the default target with an invalid installId of all 0's
        installsByIntegrationId[req.query.default as string] = ['ins-00000000000000000000000000000000'];
      }

      const dispatch = getDispatchToIntegration(req);

      const dispatchResponses: AllSettledResult = await (Promise as typeof Promise & {
        allSettled: Function;
      }).allSettled(
        Object.entries(installsByIntegrationId).map(async ([integrationId, installIds]) =>
          dispatch(integrationId, installIds)
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
      res.send(
        dispatchResponses.map((response) => ({
          status: response.status,
          value: {
            ...(response.status === 'fulfilled' ? response.value : {}),
            functionLogs: undefined,
            functionSpans: undefined,
          },
        }))
      );
    }
  );

  const getDispatchToIntegration = (req: express.Request) => (integrationId: string, installIds: string[]) =>
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
          payload: req.body.payload.map((event: IWebhookEvents) => ({ ...event, installIds })),
        },
        query: req.query,
        originalUrl: req.originalUrl,
        apiVersion: 'v2',
        mode: 'fanout',
        analytics: {
          traceId: (req as any).traceId,
          parentSpanId: (req as any).spanId,
          spanId: makeTraceSpanId(),
        },
      }
    );

  return fanOutRouter;
};

export default router;
