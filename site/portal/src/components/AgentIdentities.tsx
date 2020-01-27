import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import ConfirmNavigation from "./ConfirmNavigation";
import EntityCard from "./EntityCard";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import SaveFab from "./SaveFab";
import AddIdentityDialog from "./AddIdentityDialog";
import Link from "@material-ui/core/Link";
import { modifyAgent, saveAgent, useAgent, reloadAgent } from "./AgentProvider";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2)
  },
  identityContainer: {
    paddingLeft: theme.spacing(1) + 24,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minWidth: 480
  },
  identityAction: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  }
}));

function AgentIdentities() {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();
  const [dialogOpen, setDialogOpen] = React.useState(false);

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
    return fusebit && fusebit.source === "AgentIdentities" ? (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={agent.error} />
        </Grid>
      </Grid>
    ) : null;
  }

  const handleSave = async () => {
    saveAgent(
      agent,
      setAgent,
      e =>
        new FusebitError("Error saving identity changes", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to make identity changes."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to identities",
              func: () => reloadAgent(agent, setAgent)
            }
          ],
          source: "AgentIdentities"
        })
    );
  };

  const handleRemoveIdentity = (identity: any) => {
    if (agent.modified.identities) {
      const i = agent.modified.identities.indexOf(identity);
      if (i > -1) {
        agent.modified.identities.splice(i, 1);
        modifyAgent(agent, setAgent, { ...agent.modified });
      }
    }
  };

  const handleAddIdentity = (identity: any) => {
    setDialogOpen(false);
    if (identity) {
      agent.modified.identities = agent.modified.identities || [];
      agent.modified.identities.push(identity);
      modifyAgent(agent, setAgent, { ...agent.modified });
    }
  };

  return (
    <Grid container spacing={2} className={classes.gridContainer}>
      <Grid item xs={8} className={classes.form}>
        <div className={classes.identityContainer}>
          {(!agent.modified.identities ||
            agent.modified.identities.length === 0) && (
            <div>
              <Typography>
                The {agent.isUser ? "user" : "client"} has no identities. You
                must add at least one identity before the{" "}
                {agent.isUser ? "user" : "client"} can authenticate and access
                the system.
              </Typography>
            </div>
          )}
          {agent.modified.identities &&
            agent.modified.identities.length > 0 &&
            agent.modified.identities.map((identity: any) => (
              <EntityCard
                key={`${identity.issuerId}:${identity.subject}`}
                onRemove={() => handleRemoveIdentity(identity)}
                icon={
                  <AccountBalanceIcon fontSize="inherit" color="secondary" />
                }
              >
                <div>
                  <Typography variant="h6">{identity.subject}</Typography>
                  <Typography variant="body2">
                    Issuer:{" "}
                    <Link
                      component={RouterLink}
                      to={`../../issuers/${encodeURIComponent(
                        identity.issuerId
                      )}/overview`}
                    >
                      {identity.issuerId}
                    </Link>
                  </Typography>
                  {/* <Typography variant="body2">Last used: N/A</Typography> */}
                </div>
              </EntityCard>
            ))}
          <div className={classes.identityAction}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setDialogOpen(true)}
            >
              Add identity
            </Button>
          </div>
          {dialogOpen && <AddIdentityDialog onClose={handleAddIdentity} />}
        </div>
      </Grid>
      {agent.dirty && <ConfirmNavigation />}
      {agent.dirty && (
        <SaveFab onClick={handleSave} disabled={agent.status !== "ready"} />
      )}
    </Grid>
  );
}

export default AgentIdentities;
