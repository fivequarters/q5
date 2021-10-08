import React, { ReactElement } from 'react';
import { Button, CircularProgress, TextField } from '@material-ui/core';
import { getAccount, getInstall } from '../api/LocalStorage';
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
  const install = getInstall(tenantId);
  const tenantEndpoint = endpoint.replace(':tenantId', tenantId);
  return superagent[method](`${install.integrationBaseUrl}${tenantEndpoint}`)
    .set('Authorization', `Bearer ${account.accessToken}`)
    .send(body);
};

export function Test(): ReactElement {
  const { tenantId = '' } = useParams();
  const [waiting, setWaiting] = React.useState(false);
  const [response, setResponse] = React.useState(undefined);
  const [code, setCode] = React.useState(0);
  const [endpoint, setEndpoint] = React.useState('/api/:tenantId/users');
  const [method, setMethod] = React.useState(HttpMethod.GET);

  const testEndpoint = async () => {
    setWaiting(true);
    const result = await sendTestRequest(tenantId, endpoint, method);
    setWaiting(false);
    setResponse(result.body);
    setCode(result.status);
  };

  const child = () => {
    if (waiting) {
      return <CircularProgress />;
    }
    if (response) {
      return (
        <div>
          <h3>Response Code: {code}</h3>
          <p>Response Body:</p>
          <JSONPretty id="json-pretty" themeClassName="Adventure Time" data={response} />
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
      <Button onClick={testEndpoint} variant="contained" disabled={waiting}>
        {' '}
        Test SDK Endpoint{' '}
      </Button>
      <br />
      <br />
      {child()}
    </div>
  );
}
