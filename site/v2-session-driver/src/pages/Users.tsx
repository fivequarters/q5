import React, { ReactElement, useState } from 'react';
import { Box, Button, makeStyles } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import Sessions from '../components/Sessions';
import CreateSessionForm from '../components/CreateSessionForm';
import { ISession, listSessions, getAccount } from '../api/LocalStorage';
import { Link } from 'react-router-dom';
const TERM = 'User';

const useStyles = makeStyles((theme) => ({
  alert: {
    margin: theme.spacing(2),
  },
}));

export function Users(): ReactElement {
  const styles = useStyles();
  const storedSessions = listSessions() as ISession[];
  const account = getAccount();
  const [sessions, setSessions] = useState<ISession[]>(storedSessions);
  const onUserCreatedHandler = () => {
    const newSessions = listSessions() as ISession[];
    setSessions(newSessions);
  };
  return (
    <>
      {!account?.accountId && (
        <Alert severity="warning">
          Please setup an account first{' '}
          <Link to={'/account'}>
            <Button>Click here</Button>
          </Link>
        </Alert>
      )}
      {
        <div>
          <CreateSessionForm term={TERM} onUserCreated={onUserCreatedHandler} />
          {!sessions?.length && (
            <Alert severity="info" className={styles.alert}>
              No {TERM}s created
            </Alert>
          )}
          {sessions?.length > 0 && (
            <Box>
              <h2>{TERM}s</h2>
              <Sessions sessions={sessions} />
            </Box>
          )}
        </div>
      }
    </>
  );
}
