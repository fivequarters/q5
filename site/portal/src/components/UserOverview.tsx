import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { saveAgent, useAgent } from "./AgentProvider";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import SaveFab from "./SaveFab";
import UserDetails from "./UserDetails";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  }
}));

function UserOverview({ data, match }: any) {
  const classes = useStyles();
  const [user, setUser] = useAgent();

  if (user.status === "loading") {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (user.status === "error") {
    const fusebit = (user.error as FusebitError).fusebit;
    return fusebit && fusebit.source === "UserOverview" ? (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={user.error} />
        </Grid>
      </Grid>
    ) : null;
  }

  const handleSave = () =>
    saveAgent(
      user,
      setUser,
      e =>
        new FusebitError(`Error updating user ${user.agentId}`, {
          details:
            (e.status || e.statusCode) === 403
              ? `You are not authorized to access the user information.`
              : e.message || "Unknown error.",
          source: "UserOverview"
        })
    );

  if (user.status === "ready" || user.status === "updating") {
    return (
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={8} className={classes.form}>
          <UserDetails />
        </Grid>
        {user.dirty && <ConfirmNavigation />}
        {user.dirty && user.status === "ready" && (
          <SaveFab onClick={handleSave} />
        )}
      </Grid>
    );
  }

  return null;
}

export default UserOverview;
