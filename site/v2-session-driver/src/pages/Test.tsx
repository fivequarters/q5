import React, { ReactElement } from 'react';
import { Button, TextField } from '@material-ui/core';
import { getAccount, getInstance } from '../api/LocalStorage';
import { useParams } from 'react-router-dom';
import superagent from 'superagent';
import HttpRadioButton, { HttpMethod } from '../components/HttpRadioButton';
import JSONPretty from 'react-json-pretty';

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
  const [endpoint, setEndpoint] = React.useState('/api/:tenantId/me');
  const [method, setMethod] = React.useState(HttpMethod.GET);

  const testEndpoint = async () => {
    const result = await sendTestRequest(tenantId, endpoint, method);
    setResponse(result.body);
  };

  const child = () => {
    if (response) {
      return (
        <div>
          <p>Response Body:</p>
          <JSONPretty id="json-pretty" data={response}></JSONPretty>
        </div>
      );
    }
  };

  const handleEndpointChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndpoint(event.target.value);
  };
  const handleMethodChange = (method: HttpMethod) => {
    setMethod(method);
  };

  return (
    <div>
      <TextField
        name="integrationId"
        variant="outlined"
        label="Integration Id"
        required={true}
        value={endpoint}
        onChange={handleEndpointChange}
      />
      <br />
      <br />
      <HttpRadioButton handleMethod={handleMethodChange} />
      <br />
      <br />
      <Button onClick={testEndpoint}> Test SDK Endpoint </Button>
      <br />
      <br />
      {child()}
    </div>
  );
}
