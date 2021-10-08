import React, { ReactElement, useEffect } from 'react';
import { Button, CircularProgress } from '@material-ui/core';
import { completeSession } from '../api/completeSession';
import { pollSessionStatus } from '../api/pollSessionStatus';
import { Link } from 'react-router-dom';

export function Callback(): ReactElement {
  const [complete, setComplete] = React.useState(false);
  const [tenantId, setTenantId] = React.useState('');
  useEffect(() => {
    handleCommit();
  });

  const handleCommit = async () => {
    const sessionId = getSessionId();
    await completeSession(sessionId);
    const install = await pollSessionStatus(sessionId);
    setTenantId(install['fusebit.tenantId']);
    setComplete(true);
  };

  const getSessionId = () => {
    const queryParams = window.location.search
      .substr(1)
      .split('&')
      .reduce<Record<string, string>>((acc, param) => {
        const [key, value] = param.split('=');
        acc[key] = value;
        return acc;
      }, {});
    return queryParams.session;
  };

  const getChild = () => {
    if (complete) {
      return finished;
    }
    return spinner;
  };

  const spinner = <CircularProgress />;

  const finished = (
    <React.Fragment>
      <p>Session Completed Successfully! Click below to continue</p>
      <Link to={`/test/${tenantId}`}>
        <Button>Continue</Button>
      </Link>
    </React.Fragment>
  );

  return (
    <div>
      <h1>Welcome back!</h1>
      {getChild()}
    </div>
  );
}
