import crypto from 'crypto';
import superagent from 'superagent';
import express from 'express';
import http from 'http';
import http_error from 'http-errors';

import { defaultDatasources, defaultDashboards } from './defaults';

import * as grafana from './constants';

const router = express.Router({ mergeParams: true });

const addAccountId = (accountId: string, obj: any) =>
  JSON.parse(JSON.stringify(obj).replace(new RegExp('{{accountId}}', 'g'), accountId));

/* XXX Needs authz. */
router.post('/', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const accountId = req.params.accountId;

  try {
    console.log(`Creating organization: ${accountId}`);
    // Create the organization
    let response = await superagent
      .post(`${grafana.location}/api/orgs`)
      .set(grafana.authHeader, grafana.adminUsername)
      .send({ name: accountId })
      .ok((r) => r.status < 399 || r.status === 409);
    console.log(`  => ${response.status} ${response.text}`);

    let orgId: number;
    if (response.status === 409) {
      console.log(`Getting organization: ${accountId}`);
      // Organization already exists, query directly
      response = await superagent
        .get(`${grafana.location}/api/orgs/name/${accountId}`)
        .set(grafana.authHeader, grafana.adminUsername);
      console.log(`  => ${response.status} ${response.text}`);
      orgId = response.body.id;
    } else {
      orgId = response.body.orgId;
    }

    console.log(`Creating user for org: ${orgId}`);
    // Create the user
    response = await superagent
      .post(`${grafana.location}/api/admin/users`)
      .set(grafana.authHeader, grafana.adminUsername)
      .send({
        name: accountId,
        email: accountId,
        login: accountId,
        password: crypto.randomBytes(16).toString('hex'),
        OrgId: orgId,
      })
      .ok((r) => r.status < 399 || r.status === 412);
    console.log(`  => ${response.status} ${response.text}`);

    console.log(`Creating dataSources`);
    // Create the datasources using the admin user
    const dataSources = addAccountId(accountId, defaultDatasources);
    let responses = await Promise.all(
      dataSources.map(async (dataSource: any) => {
        const addResponse = await superagent
          .post(`${grafana.location}/api/datasources`)
          .set(grafana.authHeader, grafana.adminUsername)
          .set(grafana.orgHeader, `${orgId}`)
          .send(dataSource)
          .ok((r) => r.status < 399 || r.status === 409);

        if (addResponse.status !== 409) {
          return addResponse;
        }

        console.log(`... updating ${dataSource.uid}`);

        // Update an existing datasource.
        const getDataSource = await superagent
          .get(`${grafana.location}/api/datasources/uid/${dataSource.uid}`)
          .set(grafana.authHeader, grafana.adminUsername)
          .set(grafana.orgHeader, `${orgId}`);

        const dataSourceId = getDataSource.body.id;

        return superagent
          .put(`${grafana.location}/api/datasources/${dataSourceId}`)
          .set(grafana.authHeader, grafana.adminUsername)
          .set(grafana.orgHeader, `${orgId}`)
          .send(dataSource);
      })
    );
    responses.forEach((r: any) => console.log(`  => ${r.status} ${r.text}`));

    console.log(`Creating dashboards`);
    // Create the dashboards using the admin user (json)
    const dashboards = JSON.parse(
      JSON.stringify(defaultDashboards).replace(new RegExp('{{accountId}}', 'g'), req.params.accountId)
    );

    console.log(JSON.stringify(dashboards, null, 2));
    responses = await Promise.all(
      dashboards.map((dashboard: any) =>
        superagent
          .post(`${grafana.location}/api/dashboards/db`)
          .set(grafana.authHeader, grafana.adminUsername)
          .set(grafana.orgHeader, `${orgId}`)
          .send({
            dashboard,
            overwrite: true,
          })
      )
    );
    responses.forEach((r: any) => console.log(`  => ${r.status} ${r.text}`));

    res.send({ status: 'ok' });
  } catch (err) {
    console.log(err);
    console.log(err.response?.error);
    return next(err);
  }
});

export default router;
