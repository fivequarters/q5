import React, { ReactElement } from 'react';
import { Button, CircularProgress } from '@material-ui/core';
import { completeSession } from '../api/completeSession';
import { pollSessionStatus } from '../api/pollSessionStatus';
import { Link } from 'react-router-dom';
import { getInstance } from '../api/getInstance';
import { getSession, saveSession } from '../api/LocalStorage';

export function Callback(): ReactElement {
  const [processing, setProcessing] = React.useState(false);
  const [complete, setComplete] = React.useState(false);
  const handleCommit = async () => {
    setProcessing(true);

    const sessionId = getSessionId();
    await completeSession(sessionId);
    await pollSessionStatus(sessionId);
    const instanceId = await getInstance(sessionId);
    const session = getSession(sessionId);
    session.instanceId = instanceId;
    saveSession(session);

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
    } else if (processing) {
      return spinner;
    } else {
      return clickToContinue;
    }
  };

  const clickToContinue = (
    <React.Fragment>
      <p>Click below to commit your session</p>
      <Button onClick={handleCommit}>Commit</Button>
    </React.Fragment>
  );

  const spinner = <CircularProgress />;

  const finished = (
    <React.Fragment>
      <p>Session Completed Successfully! Click below to continue</p>
      <Link to={'/test/' + getSessionId()}>
        <Button>Continue</Button>
      </Link>
    </React.Fragment>
  );

  return (
    <div>
      <h1>Welcome back!</h1>
      {getChild}
    </div>
  );
}
