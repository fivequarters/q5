import { Grid, TextField, Button, Box, makeStyles, Paper, styled } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import React from 'react';
import { useState } from 'react';
import createSession from '../api/createSession';
import { startSession } from '../api/startSession';

const useStyles = makeStyles((theme) => ({
  control: {
    padding: theme.spacing(1),
  },
  input: {
    width: 300,
    margin: theme.spacing(1),
  },
  formFooter: {
    backgroundColor: '#f2f2f2',
    marginTop: theme.spacing(2),
    padding: theme.spacing(1),
  },
  alert: {
    marginTop: theme.spacing(1),
  },
}));

export interface CreateSessionProps {
  term: string;
  onUserCreated?(user: any): void;
}

export default function CreateSessionForm({ term, onUserCreated }: CreateSessionProps) {
  const style = useStyles();
  const sessionFieldsInitialState = {
    integrationId: '',
    tenantId: '',
  };
  const [sessionFields, setSessionField] = useState(sessionFieldsInitialState);
  const [loading, setIsLoading] = useState(false);
  const [missingFields, setMissingFields] = useState(false);
  const [error, setError] = useState();

  const handleFieldChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setSessionField({
      ...sessionFields,
      [name]: value,
    });
  };

  const areFieldsValid = () => {
    const { integrationId, tenantId } = sessionFields;
    return integrationId && tenantId;
  };

  const onCreateSessionClick = async (event: React.MouseEvent<HTMLElement>) => {
    setError(undefined);
    if (areFieldsValid()) {
      setMissingFields(false);
      setIsLoading(true);
      try {
        const { integrationId, tenantId } = sessionFields;
        const session = await createSession(integrationId, tenantId);
        return startSession(session);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      setMissingFields(true);
    }
  };

  return (
    <Paper className={style.control}>
      <form>
        <Box className={style.control}>
          <h2>Create a new {term}</h2>
          <Alert severity="info">
            Please fill out the following information in order to create a new {term} to start using the specified
            integration
          </Alert>
          {missingFields && (
            <Alert className={style.alert} severity="error">
              {' '}
              Please specify any missing fields
            </Alert>
          )}
          {error && (
            <Alert className={style.alert} severity="error">
              {error}
            </Alert>
          )}
          <Grid container className={style.control}>
            <Grid item xs={12}>
              <TextField
                name="integrationId"
                variant="outlined"
                label="Integration Id"
                required={true}
                disabled={loading}
                className={style.input}
                value={sessionFields.integrationId}
                onChange={handleFieldChange}
              />
              <TextField
                name="tenantId"
                variant="outlined"
                label="Tenant Id"
                required={true}
                disabled={loading}
                className={style.input}
                value={sessionFields.tenantId}
                onChange={handleFieldChange}
              />
            </Grid>
          </Grid>
        </Box>
        <Box className={style.formFooter}>
          <Button disabled={loading} variant="contained" color="primary" onClick={onCreateSessionClick}>
            {!loading && `Authorize ${term}`}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
