import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import EmailIcon from "@material-ui/icons/Email";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import PersonIcon from "@material-ui/icons/Person";
import React from "react";
import { User } from "../lib/FusebitTypes";
import { modifyAgent, saveAgent, useAgent } from "./AgentProvider";
import ConfirmNavigation from "./ConfirmNavigation";
import InputWithIcon from "./InputWithIcon";
import PortalError from "./PortalError";
import SaveFab from "./SaveFab";
import { FusebitError } from "./ErrorBoundary";

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

  const handleFirstNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (user.status === "ready") {
      (user.modified as User).firstName = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

  const handleLastNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (user.status === "ready") {
      (user.modified as User).lastName = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (user.status === "ready") {
      (user.modified as User).primaryEmail = event.target.value;
      modifyAgent(user, setUser, { ...user.modified });
    }
  };

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
          <form noValidate autoComplete="off">
            <InputWithIcon icon={<FingerprintIcon />}>
              <TextField
                id="userId"
                label="User ID"
                variant="outlined"
                disabled
                value={user.existing.id}
                fullWidth
              />
            </InputWithIcon>
            <InputWithIcon icon={<PersonIcon />}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    id="firstName"
                    label="First Name"
                    variant="outlined"
                    value={(user.modified as User).firstName || ""}
                    onChange={handleFirstNameChange}
                    disabled={user.status !== "ready"}
                    fullWidth
                    autoFocus
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="lastName"
                    label="Last Name"
                    variant="outlined"
                    value={(user.modified as User).lastName || ""}
                    disabled={user.status !== "ready"}
                    onChange={handleLastNameChange}
                    fullWidth
                    // autoFocus
                  />
                </Grid>
              </Grid>
            </InputWithIcon>
            <InputWithIcon icon={<EmailIcon />}>
              <TextField
                id="primaryEmail"
                label="Email"
                variant="outlined"
                type="email"
                value={(user.modified as User).primaryEmail || ""}
                disabled={user.status !== "ready"}
                onChange={handleEmailChange}
                fullWidth
              />
            </InputWithIcon>
          </form>
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
