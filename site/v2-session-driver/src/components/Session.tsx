import React from 'react';
import { Button, TableCell, TableRow } from '@material-ui/core';
import LaunchIcon from '@material-ui/icons/Launch';
import { ISession, markSessionComplete } from '../api/LocalStorage';
import { startSession } from '../api/startSession';
import { Link } from 'react-router-dom';

export default function Sessions({ session }: { session: ISession }) {
  const button = session.completed ? <TestButton session={session} /> : <StartButton session={session} />;
  const integrationArray = session.integrationBaseUrl.split('/');
  const integration = integrationArray[integrationArray.length - 1];
  return (
    <TableRow key={session.sessionId}>
      <TableCell>{session.tenantId}</TableCell>
      <TableCell>{integration}</TableCell>
      <TableCell>{button}</TableCell>
    </TableRow>
  );
}

function StartButton({ session }: { session: ISession }) {
  return (
    <Button variant="contained" color="secondary" onClick={() => startSession(session)}>
      <LaunchIcon fontSize="small" />
      Start
    </Button>
  );
}

function TestButton({ session }: { session: ISession }) {
  return (
    <Link to={'/test/' + session.sessionId}>
      <Button variant="contained" color="secondary">
        <LaunchIcon fontSize="small" />
        Test
      </Button>
    </Link>
  );
}
