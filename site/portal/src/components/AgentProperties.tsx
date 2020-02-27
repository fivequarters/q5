import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import Button from "@material-ui/core/Button";
import DialogContentText from "@material-ui/core/DialogContentText";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { saveAgent, useAgent, modifyAgent } from "./AgentProvider";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import SaveFab from "./SaveFab";
import UserDetails from "./UserDetails";
import ClientDetails from "./ClientDetails";
import AgentIdentities from "./AgentIdentities";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import InputWithIcon from "./InputWithIcon";
import InfoCard from "./InfoCard";
import AddIdentityDialog from "./AddIdentityDialog";
import SetupAccessDialog from "./SetupAccessDialog";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  },
  identities: {
    paddingTop: 14
  },
  identityAction: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    justifyContent: "space-between",
    paddingLeft: theme.spacing(1) + 24
  }
}));

function AgentProperties() {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();
  const [addIdentityDialogOpen, setAddIdentityDialogOpen] = React.useState(
    false
  );
  const [setupAccessDialogOpen, setSetupAccessDialogOpen] = React.useState(
    false
  );

  if (agent.status === "loading") {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (agent.status === "error") {
    const fusebit = (agent.error as FusebitError).fusebit;
    return fusebit && fusebit.source === "AgentProperties" ? (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={agent.error} />
        </Grid>
      </Grid>
    ) : null;
  }

  const formatAgent = () => (agent.isUser ? "user" : "client");

  const handleAddIdentity = (identity: any) => {
    setAddIdentityDialogOpen(false);
    if (identity && agent.status === "ready") {
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
              : e.message || "Unknown error.",
          source: "AgentProperties"
        })
    );

  if (agent.status === "ready" || agent.status === "updating") {
    return (
      <React.Fragment>
        <Grid container spacing={2} className={classes.gridContainer}>
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
                color="secondary"
                onClick={() => setAddIdentityDialogOpen(true)}
                disabled={agent.status !== "ready"}
              >
                Add identity
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setSetupAccessDialogOpen(true)}
                disabled={agent.status !== "ready"}
              >
                {agent.isUser
                  ? "Invite user to Fusebit"
                  : "Connect client to Fusebit"}
              </Button>
            </div>
            {addIdentityDialogOpen && (
              <AddIdentityDialog onClose={handleAddIdentity} />
            )}
            {setupAccessDialogOpen && (
              <SetupAccessDialog
                onClose={() => setSetupAccessDialogOpen(false)}
              />
            )}
          </Grid>
          <Grid item xs={4} className={classes.form}>
            <InfoCard>
              {agent.isUser && (
                <DialogContentText>
                  Add identity manually, or generate an invitation for the user
                  to access the system and automatically create an identity.
                </DialogContentText>
              )}
              {!agent.isUser && (
                <DialogContentText>
                  Add identity manually, or generate a command to initialize a
                  CLI client and automatically create an identity.
                </DialogContentText>
              )}
            </InfoCard>
          </Grid>
        </Grid>
        {agent.dirty && <ConfirmNavigation />}
        {agent.dirty && agent.status === "ready" && (
          <SaveFab onClick={handleSave} />
        )}
      </React.Fragment>
    );
  }

  return null;
}

export default AgentProperties;
