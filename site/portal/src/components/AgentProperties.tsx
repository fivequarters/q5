import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { saveAgent, useAgent } from "./AgentProvider";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import SaveFab from "./SaveFab";
import UserDetails from "./UserDetails";
import ClientDetails from "./ClientDetails";
import AgentIdentities from "./AgentIdentities";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import InputWithIcon from "./InputWithIcon";

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
  }
}));

function AgentProperties({ data, match }: any) {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();

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
        {agent.dirty && <ConfirmNavigation />}
        {agent.dirty && agent.status === "ready" && (
          <SaveFab onClick={handleSave} />
        )}
      </Grid>
    );
  }

  return null;
}

export default AgentProperties;
