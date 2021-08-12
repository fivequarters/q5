import { Grid, TextField, Button, Box, makeStyles, Paper, StylesProvider } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React from 'react';
import { useState } from 'react';
import { ILocalStorage } from '../api/LocalStorage';
import createSession from '../api/createSession';
const TERM = 'user';

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

export default function CreateSessionForm() {
  const style = useStyles();
  const sessionFieldsInitialState = {
    accessToken: '',
    integrationId: '',
    tenantId: '',
  };
  const [sessionFields, setSessionField] = useState(sessionFieldsInitialState);
  const [loading, setIsLoading] = useState(false);
  const [missingFields, setMissingFields] = useState(false);
  const [error, setError] = useState();
  const [sessionCreated, setSessionCreated] = useState(false);

  const handleFieldChange = (event: { target: { name: string; value: string } }) => {
    const { name, value } = event.target;
    setSessionField({
      ...sessionFields,
      [name]: value,
    });
  };

  const areFieldsValid = () => {
    const { accessToken, integrationId, tenantId } = sessionFields;
    return accessToken && integrationId && tenantId;
  };

  const onCreateSessionClick = async (event: React.MouseEvent<HTMLElement>) => {
    setError(undefined);
    setSessionCreated(false);
    if (areFieldsValid()) {
      setMissingFields(false);
      setIsLoading(true);
      try {
        const { accessToken, integrationId, tenantId } = sessionFields;
        await createSession(accessToken, integrationId, tenantId);
        setSessionCreated(true);
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
          <h2>Create a new {TERM}</h2>
          <Alert severity="info">
            Please fill out the following information in order to create a new {TERM} to start using the specified
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
          {sessionCreated && (
            <Alert className={style.alert} severity="success">
              The {TERM} has been created!
            </Alert>
          )}
          <Grid container className={style.control}>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                name="accessToken"
                label="Access Token"
                required={true}
                className={style.input}
                value={sessionFields.accessToken}
                onChange={handleFieldChange}
              />
              <TextField
                name="integrationId"
                variant="outlined"
                label="Integration Id"
                required={true}
                className={style.input}
                value={sessionFields.integrationId}
                onChange={handleFieldChange}
              />
              <TextField
                name="tenantId"
                variant="outlined"
                label="Tenant Id"
                required={true}
                className={style.input}
                value={sessionFields.tenantId}
                onChange={handleFieldChange}
              />
            </Grid>
          </Grid>
        </Box>
        <Box className={style.formFooter}>
          <Button variant="contained" color="primary" onClick={onCreateSessionClick}>
            Create {TERM}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
