import React, { ReactElement } from 'react';
import { Button } from '@material-ui/core';
import { getSession } from '../api/LocalStorage';
// @ts-ignore
import { useParams } from 'react-router-dom';
import superagent from 'superagent';

export function Test(): ReactElement {
  let { sessionId } = useParams();
  const [response, setResponse] = React.useState(undefined);
  const session = getSession(sessionId);
  const testEndpoint = async (event: React.MouseEvent) => {
    const result = await superagent.get(`${session.integrationBaseUrl}/instance/${session.instanceId}/api/test`);
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
      {child}
      <Button onClick={testEndpoint}> Test SDK Endpoint </Button>
    </div>
  );
}
