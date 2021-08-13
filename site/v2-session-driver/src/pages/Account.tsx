import React, { ReactElement, useState } from 'react';
import { setAccount } from '../api/LocalStorage';
import { Grid, TextField, makeStyles, Box, Button, Paper, Divider } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { getAccount } from '../api/LocalStorage';
import IntegrationForm from '../components/IntegrationForm';

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
  divider: {
    margin: theme.spacing(1),
  },
}));

export function Account(): ReactElement {
  const account = getAccount();
  const styles = useStyles();
  const [accountId, setAccountId] = useState(account?.accountId);
  const [subscriptionId, setSubscriptionId] = useState(account?.subscriptionId);
  const [accessToken, setAccessToken] = useState(account?.accessToken);
  const [error, setError] = useState(false);
  const handleAccountIdInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountId(event.target.value);
  };
  const handleSubscriptionIdInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubscriptionId(event.target.value);
  };
  const handleAccessTokenInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccessToken(event.target.value);
  };
  const handleSaveAccount = async (event: React.MouseEvent) => {
    if (accountId && subscriptionId) {
      setError(false);
      setAccount({ accountId, subscriptionId, accessToken });
      window.location.href = '/users';
    } else {
      setError(true);
    }
  };
  return (
    <>
      <Paper className={styles.control}>
        <form>
          <h2>Account details</h2>
          <Alert severity="info">Please specify your account details</Alert>
          {error && (
            <Alert className={styles.alert} severity="error">
              Please specify any missing fields
            </Alert>
          )}
          <Grid container className={styles.control}>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                name="accountId"
                label="Account Id"
                required={true}
                value={accountId}
                className={styles.input}
                onChange={handleAccountIdInput}
              />
              <TextField
                variant="outlined"
                name="subscriptionId"
                label="Subscription Id"
                required={true}
                className={styles.input}
                value={subscriptionId}
                onChange={handleSubscriptionIdInput}
              />
              <TextField
                variant="outlined"
                name="accessToken"
                label="Access Token"
                required={true}
                className={styles.input}
                value={accessToken}
                onChange={handleAccessTokenInput}
              />
            </Grid>
          </Grid>
          <Box className={styles.formFooter}>
            <Button variant="contained" color="primary" onClick={handleSaveAccount}>
              Save account details
            </Button>
          </Box>
        </form>
      </Paper>
      <Divider className={styles.divider} />
      <IntegrationForm />
    </>
  );
}
