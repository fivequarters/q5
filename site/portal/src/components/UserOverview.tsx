import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import EmailIcon from "@material-ui/icons/Email";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import PersonIcon from "@material-ui/icons/Person";
import React from "react";
import { getUser, normalizeUser, updateUser } from "../lib/Fusebit";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import SaveFab from "./SaveFab";
import InputWithIcon from "./InputWithIcon";

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
  const { profile } = useProfile();
  const { params } = match;
  const { userId } = params;
  const [user, setUser] = React.useState<any>(undefined);

  const createUserState = (data: any) =>
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
    if (user === undefined) {
      (async () => {
        let data: any;
        try {
          data = await getUser(profile, userId as string);
        } catch (e) {
          data = {
            error: new FusebitError("Error loading user information", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to access the user information."
                  : e.message || "Unknown error."
            })
          };
        }
        !cancelled && setUser(createUserState(data));
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [user, profile, userId]);

  if (!user) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (user.error) {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={user.error} />
        </Grid>
      </Grid>
    );
  }

  const handleFirstNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    user.modified.firstName = event.target.value;
    setUser({ ...user });
  };

  const handleLastNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    user.modified.lastName = event.target.value;
    setUser({ ...user });
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    user.modified.primaryEmail = event.target.value;
    setUser({ ...user });
  };

  const updateErrorStates = (user: any) => {
    return user;
  };

  const isDirty = () => {
    const existing = normalizeUser(user.existing);
    const modified = normalizeUser(user.modified);
    const isDirty = JSON.stringify(existing) !== JSON.stringify(modified);
    return isDirty;
  };

  const isError = () => {
    return false;
  };

  const handleSave = async () => {
    let data: any;
    try {
      data = await updateUser(profile, normalizeUser(user.modified));
    } catch (e) {
      data = {
        error: new FusebitError("Error saving user changes", {
          details:
            (e.status || e.statusCode) === 403
              ? "You are not authorized to make user changes."
              : e.message || "Unknown error.",
          actions: [
            {
              text: "Back to user",
              func: () => setUser(undefined)
            }
          ]
        })
      };
    }
    setUser(updateErrorStates(createUserState(data)));
  };

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
                  value={user.modified.firstName || ""}
                  onChange={handleFirstNameChange}
                  fullWidth
                  autoFocus
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  id="lastName"
                  label="Last Name"
                  variant="outlined"
                  value={user.modified.lastName || ""}
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
              value={user.modified.primaryEmail || ""}
              onChange={handleEmailChange}
              fullWidth
            />
          </InputWithIcon>
        </form>
      </Grid>
      {isDirty() && <ConfirmNavigation />}
      {isDirty() && <SaveFab onClick={handleSave} disabled={isError()} />}
    </Grid>
  );
}

export default UserOverview;
