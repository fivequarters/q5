import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import ProgressView from './ProgressView';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import React from 'react';
import AddIdentityDialog from './AddIdentityDialog';
import AgentIdentities from './AgentIdentities';
import { modifyAgent, saveAgent, useAgent } from './AgentProvider';
import ClientDetails from './ClientDetails';
import ConfirmNavigation from './ConfirmNavigation';
import { FusebitError } from './ErrorBoundary';
import InfoCard from './InfoCard';
import InputWithIcon from './InputWithIcon';
import PortalError from './PortalError';
import SetupAccessDialog from './SetupAccessDialog';
import UserDetails from './UserDetails';

const useStyles = makeStyles((theme: any) => ({
  gridContainer2: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2),
  },
  form: {
    overflow: 'hidden',
  },
  identities: {
    paddingTop: 14,
  },
  identityAction: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing(1) + 24,
  },
  actions: {
    marginLeft: theme.spacing(4),
  },
}));

function AgentProperties() {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();
  const [addIdentityDialogOpen, setAddIdentityDialogOpen] = React.useState(false);
  const [setupAccessDialogOpen, setSetupAccessDialogOpen] = React.useState(false);

  if (agent.status === 'loading') {
    return <ProgressView />;
  }

  if (agent.status === 'error') {
    const fusebit = (agent.error as FusebitError).fusebit;
    return fusebit && fusebit.source === 'AgentProperties' ? (
      <Grid container className={classes.gridContainer2} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={agent.error} />
        </Grid>
      </Grid>
    ) : null;
  }

  const formatAgent = () => (agent.isUser ? 'user' : 'client');

  const handleAddIdentity = (identity: any) => {
    setAddIdentityDialogOpen(false);
    if (identity && agent.status === 'ready') {
      agent.modified.identities = agent.modified.identities || [];
      agent.modified.identities.push(identity);
      modifyAgent(agent, setAgent, { ...agent.modified });
    }
  };

  const handleSave = () =>
    saveAgent(
      agent,
      setAgent,
      e =>
        new FusebitError(`Error updating ${formatAgent()} ${agent.agentId}`, {
          details:
            (e.status || e.statusCode) === 403
              ? `You are not authorized to access ${formatAgent()} information.`
              : e.message || 'Unknown error.',
          source: 'AgentProperties',
        })
    );

  const handleReset = () => modifyAgent(agent, setAgent, JSON.parse(JSON.stringify(agent.existing)));

  if (agent.status === 'ready' || agent.status === 'updating') {
    return (
      <React.Fragment>
        <Grid container spacing={2} className={classes.gridContainer2}>
          <Grid item xs={8} className={classes.form}>
            {agent.isUser && <UserDetails />}
            {!agent.isUser && <ClientDetails />}
            <InputWithIcon icon={<AccountBalanceIcon />}>
              <Typography variant="h6" className={classes.identities}>
                Identities
              </Typography>
            </InputWithIcon>
            <AgentIdentities />
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <div className={classes.identityAction}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setAddIdentityDialogOpen(true)}
                disabled={agent.status !== 'ready'}
              >
                Add identity
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setSetupAccessDialogOpen(true)}
                disabled={agent.status !== 'ready'}
              >
                {agent.isUser ? 'Invite user to Fusebit' : 'Connect client to Fusebit'}
              </Button>
            </div>
            {addIdentityDialogOpen && <AddIdentityDialog onClose={handleAddIdentity} />}
            {setupAccessDialogOpen && <SetupAccessDialog onClose={() => setSetupAccessDialogOpen(false)} />}
          </Grid>
          <Grid item xs={4} className={classes.form}>
            <InfoCard>
              {agent.isUser &&
                'Add identity manually, or generate an invitation for the user to access the system and automatically create an identity.'}
              {!agent.isUser &&
                'Add identity manually, or generate a command to initialize a CLI client and automatically create an identity.'}
            </InfoCard>
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <Button
              color="secondary"
              variant="contained"
              disabled={!agent.dirty || agent.status !== 'ready'}
              onClick={handleSave}
              className={classes.actions}
            >
              Save
            </Button>
            <Button variant="text" color="primary" onClick={handleReset} disabled={!agent.dirty}>
              Reset
            </Button>
          </Grid>
        </Grid>
        {agent.dirty && <ConfirmNavigation />}
      </React.Fragment>
    );
  }

  return null;
}

export default AgentProperties;
