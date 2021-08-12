import React, { ReactElement } from 'react';
import { Button } from '@material-ui/core';
import { getAccount, getInstance } from '../api/LocalStorage';
import { useParams } from 'react-router-dom';
import superagent from 'superagent';

enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
}

const sendTestRequest = async (
  tenantId: string,
  endpoint: string,
  method: HttpMethod = HttpMethod.GET,
  body?: object
) => {
  const account = getAccount();
  const instance = getInstance(tenantId);
  console.log('tenantId', tenantId);
  const tenantEndpoint = endpoint.replace(':tenantId', tenantId);
  console.log(account.accessToken);
  console.log('endpoint', `${instance.integrationBaseUrl}${tenantEndpoint}`);
  return superagent[method](`${instance.integrationBaseUrl}${tenantEndpoint}`)
    .set('Authorization', `Bearer ${account.accessToken}`)
    .send(body);
};

export function Test(): ReactElement {
  const { tenantId = '' } = useParams();
  const [response, setResponse] = React.useState(undefined);

  const testEndpoint = async () => {
    console.log('Test.tsx, tenantId', tenantId);
    const instance = getInstance(tenantId);
    console.log(instance);
    const result = await sendTestRequest(tenantId, '/api/:tenantId/me');
    setResponse(result.body);
  };

  const child = () => {
    if (response) {
      return (
        <div>
          <p>Response Body:</p>
          {JSON.stringify(response)}
        </div>
      );
    }
  };

  return (
    <div>
      {child()}
      <Button onClick={testEndpoint}> Test SDK Endpoint </Button>
    </div>
  );
}
