import crypto from 'crypto';
import superagent from 'superagent';
import express from 'express';
import http_error from 'http-errors';

import { AccountActions } from '@5qtrs/account';
import { isGrafanaEnabled } from '@5qtrs/constants';

import authorize from '../middleware/authorize';

import * as grafana from './constants';
import { defaultDatasources, defaultDashboards } from './defaults';

const router = express.Router({ mergeParams: true });

const addAccountId = (accountId: string, obj: any) =>
  JSON.parse(JSON.stringify(obj).replace(new RegExp('{{accountId}}', 'g'), accountId));

router.post(
  '/',
  authorize({ operation: AccountActions.updateAccount }),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const accountId = req.params.accountId;

    const lastAction = { action: 'unknown' };

    if (!isGrafanaEnabled()) {
      return res.send({ status: 'unsupported' });
    }

    try {
      await initializeGrafana(accountId, lastAction);

      res.send({ status: 'ok' });
    } catch (err) {
      console.log(lastAction.action, err.response?.error, err);
      return next(http_error(500, `Failed step '${lastAction.action}': ${err.response?.error || err}`));
    }
  }
);

const initializeGrafana = async (accountId: string, lastAction: { action: string }): Promise<void> => {
  const creds = await grafana.getAdminCreds();

  lastAction.action = 'Create Organization';
  // Create the organization
  let response = await superagent
    .post(`${grafana.location}/api/orgs`)
    .set(grafana.authHeader, creds.grafana.admin_username)
    .send({ name: accountId })
    .ok((r) => r.status < 399 || r.status === 409);

  let orgId: number;
  if (response.status === 409) {
    lastAction.action = 'Get Organization';
    // Organization already exists, query directly
    response = await superagent
      .get(`${grafana.location}/api/orgs/name/${accountId}`)
      .set(grafana.authHeader, creds.grafana.admin_username);
    orgId = response.body.id;
  } else {
    orgId = response.body.orgId;
  }

  let userId: number;
  lastAction.action = 'Create User';
  // Create the user
  response = await superagent
    .post(`${grafana.location}/api/admin/users`)
    .set(grafana.authHeader, creds.grafana.admin_username)
    .send({
      name: accountId,
      email: accountId,
      login: accountId,
      password: crypto.randomBytes(16).toString('hex'),
      OrgId: orgId,
    })
    .ok((r) => r.status < 399 || r.status === 412);
  if (response.status === 412) {
    lastAction.action = 'Get User ID';
    response = await superagent
      .get(`${grafana.location}/api/users/search?query=${accountId}`)
      .set(grafana.authHeader, creds.grafana.admin_username)
      .set(grafana.orgHeader, `${orgId}`);
    userId = response.body.users[0].id;
  } else {
    userId = response.body.id;
  }

  lastAction.action = 'Update Role';
  // Set the role for the user to Viewer
  response = await superagent
    .patch(`${grafana.location}/api/org/users/${userId}`)
    .set(grafana.authHeader, creds.grafana.admin_username)
    .set(grafana.orgHeader, `${orgId}`)
    .send({ role: 'Viewer' }); // Change this from Viewer to Admin if you want more access.

  lastAction.action = 'Create Datasources';
  // Create the datasources using the admin user
  const dataSources = addAccountId(accountId, defaultDatasources);
  await Promise.all(
    dataSources.map(async (dataSource: any) => {
      const addResponse = await superagent
        .post(`${grafana.location}/api/datasources`)
        .set(grafana.authHeader, creds.grafana.admin_username)
        .set(grafana.orgHeader, `${orgId}`)
        .send(dataSource)
        .ok((r) => r.status < 399 || r.status === 409);

      if (addResponse.status !== 409) {
        return addResponse;
      }

      // Update an existing datasource.
      const getDataSource = await superagent
        .get(`${grafana.location}/api/datasources/uid/${dataSource.uid}`)
        .set(grafana.authHeader, creds.grafana.admin_username)
        .set(grafana.orgHeader, `${orgId}`);

      const dataSourceId = getDataSource.body.id;

      return superagent
        .put(`${grafana.location}/api/datasources/${dataSourceId}`)
        .set(grafana.authHeader, creds.grafana.admin_username)
        .set(grafana.orgHeader, `${orgId}`)
        .send(dataSource);
    })
  );

  lastAction.action = 'Create Dashboards';
  // Create the dashboards using the admin user (json)
  const dashboards = JSON.parse(JSON.stringify(defaultDashboards).replace(new RegExp('{{accountId}}', 'g'), accountId));

  await Promise.all(
    dashboards.map((dashboard: any) =>
      superagent
        .post(`${grafana.location}/api/dashboards/db`)
        .set(grafana.authHeader, creds.grafana.admin_username)
        .set(grafana.orgHeader, `${orgId}`)
        .send({
          dashboard,
          overwrite: true,
        })
    )
  );
};

export default router;
export { initializeGrafana };
