import React, { ReactElement, useState } from 'react';
import { Grid, TextField, makeStyles, Box, Button, Paper, Divider } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { saveIntegration, getIntegration, listIntegrations, removeIntegration } from '../api/LocalStorage';
import Integrations from './Integrations';

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

export default function IntegrationForm(): ReactElement {
  const initialIntegrations = listIntegrations();
  const hasIntegrations = !!initialIntegrations?.length;
  const styles = useStyles();
  const [integrationId, setIntegrationId] = useState('');
  const [error, setError] = useState('');
  const [integrationAdded, setIntegrationAdded] = useState(false);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const handleIntegrationInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIntegrationId(event.target.value);
  };
  const onSaveIntegrationClick = (event: React.MouseEvent<HTMLElement>) => {
    if (integrationId) {
      const integrationExists = getIntegration(integrationId);
      if (integrationExists) {
        setError('Integration already added');
      } else {
        saveIntegration(integrationId);
        const refreshedIntegrations = listIntegrations();
        setIntegrations(refreshedIntegrations);
        setError('');
        setIntegrationAdded(true);
        setIntegrationId('');
      }
    } else {
      setError('Please specify integration name');
      setIntegrationAdded(false);
    }
  };

  const handleDeleteIntegrationClick = (integrationId: string) => {
    const confirm = window.confirm(
      'Are you sure you want to delete this integration ? (this will remove only the integration from our demo local storage)'
    );
    if (confirm) {
      removeIntegration(integrationId);
      setIntegrations(listIntegrations());
    }
  };

  return (
    <Paper className={styles.control}>
      <form>
        <h2>Integrations</h2>
        <Alert severity="info">
          In order to facilitate testing your integrations, add the ones you want to test here.
        </Alert>
        {error && (
          <Alert className={styles.alert} severity="error">
            {error}
          </Alert>
        )}
        {!error && integrationAdded && (
          <Alert className={styles.alert} severity="success">
            Integration added!
          </Alert>
        )}
        <Grid container className={styles.control}>
          <Grid item xs={12}>
            <TextField
              variant="outlined"
              name="integrationId"
              label="Integration name"
              required={true}
              value={integrationId}
              className={styles.input}
              onChange={handleIntegrationInput}
            />
          </Grid>
        </Grid>
        <Box className={styles.formFooter}>
          <Button variant="contained" color="primary" onClick={onSaveIntegrationClick}>
            Save
          </Button>
        </Box>
      </form>
      {hasIntegrations && (
        <>
          <Divider />
          <h2>Your integrations</h2>
          <Integrations integrations={integrations} onDeleteClick={handleDeleteIntegrationClick} />
        </>
      )}
    </Paper>
  );
}
