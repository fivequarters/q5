import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import AddIdentityDialog from "./AddIdentityDialog";
import { modifyAgent, useAgent } from "./AgentProvider";
import EntityCard from "./EntityCard";

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

  const handleRemoveIdentity = (identity: any) => {
    if (agent.status === "ready" && agent.modified.identities) {
      const i = agent.modified.identities.indexOf(identity);
      if (i > -1) {
        agent.modified.identities.splice(i, 1);
        modifyAgent(agent, setAgent, { ...agent.modified });
      }
    }
  };

  const handleAddIdentity = (identity: any) => {
    setDialogOpen(false);
    if (identity && agent.status === "ready") {
      agent.modified.identities = agent.modified.identities || [];
      agent.modified.identities.push(identity);
      modifyAgent(agent, setAgent, { ...agent.modified });
    }
  };

  if (agent.status === "ready" || agent.status === "updating") {
    return (
      <div className={classes.identityContainer}>
        {(!agent.modified.identities ||
          agent.modified.identities.length === 0) && (
          <div>
            <Typography>
              The {agent.isUser ? "user" : "client"} has no identities. You must
              add at least one identity before the{" "}
              {agent.isUser ? "user" : "client"} can authenticate and access the
              system.
            </Typography>
          </div>
        )}
        {agent.modified.identities &&
          agent.modified.identities.length > 0 &&
          agent.modified.identities.map((identity: any) => (
            <EntityCard
              key={`${identity.issuerId}:${identity.subject}`}
              actions={
                <React.Fragment>
                  <Button
                    variant="text"
                    onClick={() => handleRemoveIdentity(identity)}
                    disabled={agent.status !== "ready"}
                    color="primary"
                  >
                    Remove
                  </Button>
                  <Button
                    variant="text"
                    component={RouterLink}
                    to={`../../issuers/${encodeURIComponent(
                      identity.issuerId
                    )}/properties`}
                    disabled={agent.status !== "ready"}
                  >
                    View issuer
                  </Button>
                </React.Fragment>
              }
              icon={<AccountBalanceIcon fontSize="inherit" color="secondary" />}
            >
              <div>
                <Typography variant="h6">{identity.subject}</Typography>
                <Typography variant="body2">
                  Issuer: {identity.issuerId}
                </Typography>
              </div>
            </EntityCard>
          ))}
        <div className={classes.identityAction}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setDialogOpen(true)}
            disabled={agent.status !== "ready"}
          >
            Add identity
          </Button>
        </div>
        {dialogOpen && <AddIdentityDialog onClose={handleAddIdentity} />}
      </div>
    );
  } else {
    return null;
  }
}

export default AgentIdentities;
