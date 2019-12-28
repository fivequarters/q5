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
import { useProfile } from "./ProfileProvider";
import SaveFab from "./SaveFab";
import AddIdentityDialog from "./AddIdentityDialog";
import Link from "@material-ui/core/Link";

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

function AgentIdentities({
  data,
  match,
  getAgent,
  updateAgent,
  normalizeAgent,
  isUser
}: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const { params } = match;
  const { clientId, userId } = params;
  const agentId = (isUser ? userId : clientId) as string;
  const [agent, setAgent] = React.useState<any>(undefined);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const createAgentState = (data: any) =>
    data.error
      ? data
      : {
          existing: data,
          modified: {
            ...JSON.parse(JSON.stringify(data))
          }
        };

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (agent === undefined) {
      (async () => {
        let data: any;
        try {
          data = await getAgent(profile, agentId);
        } catch (e) {
          data = {
            error: new FusebitError("Error loading identity information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to access the identity information."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setAgent(createAgentState(data));
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [agent, profile, agentId]);

  if (!agent) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (agent.error) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={agent.error} />
        </Grid>
      </Grid>
    );
  }

  const updateErrorStates = (agent: any) => {
    return agent;
  };

  const isDirty = () => {
    const existing = normalizeAgent(agent.existing);
    const modified = normalizeAgent(agent.modified);
    const isDirty = JSON.stringify(existing) !== JSON.stringify(modified);
    return isDirty;
  };

  const isError = () => {
    return false;
  };

  const handleSave = async () => {
    let data: any;
    try {
      data = await updateAgent(profile, normalizeAgent(agent.modified));
    } catch (e) {
      data = {
        error: new FusebitError("Error saving identity changes", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to make identity changes."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to identities",
              func: () => setAgent(undefined)
            }
          ]
        })
      };
    }
    setAgent(updateErrorStates(createAgentState(data)));
  };

  const handleRemoveIdentity = (identity: any) => {
    const i = agent.modified.identities.indexOf(identity);
    if (i > -1) {
      agent.modified.identities.splice(i, 1);
      setAgent({ ...agent });
    }
  };

  const handleAddIdentity = (identity: any) => {
    setDialogOpen(false);
    if (identity) {
      agent.modified.identities.push(identity);
      setAgent({ ...agent });
    }
  };

  return (
    <Grid container spacing={2} className={classes.gridContainer}>
      <Grid item xs={8} className={classes.form}>
        <div className={classes.identityContainer}>
          {agent.modified.identities.length === 0 && (
            <div>
              <Typography>
                The {isUser ? "user" : "client"} has no identities. You must add
                at least one identity before the {isUser ? "user" : "client"}{" "}
                can authenticate.
              </Typography>
            </div>
          )}
          {agent.modified.identities.map((identity: any) => (
            <EntityCard
              key={`${identity.issuerId}:${identity.subject}`}
              onRemove={() => handleRemoveIdentity(identity)}
              icon={<AccountBalanceIcon fontSize="inherit" color="secondary" />}
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
          {dialogOpen && (
            <AddIdentityDialog
              onClose={handleAddIdentity}
              agentId={agentId}
              isUser={isUser}
            />
          )}
        </div>
      </Grid>
      {isDirty() && <ConfirmNavigation />}
      {isDirty() && <SaveFab onClick={handleSave} disabled={isError()} />}
    </Grid>
  );
}

export default AgentIdentities;
