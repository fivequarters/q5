import DialogContentText from "@material-ui/core/DialogContentText";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import React from "react";
import FunctionResourceSelector from "./FunctionResourceSelector";
import InfoCard from "./InfoCard";
import { useProfile } from "./ProfileProvider";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginTop: theme.spacing(1)
    // marginBottom: theme.spacing(2)
  },
  inputField: {
    marginTop: theme.spacing(2)
  }
}));

function AccountSettings() {
  const classes = useStyles();
  const { profile, saveProfile } = useProfile();
  const [defaultResource, setDefaultResource] = React.useState<any>(
    createInitialResource()
  );

  function createInitialResource() {
    return {
      parts: {
        subscriptionId: profile.subscription || "*",
        boundaryId: profile.boundary || "",
        functionId: profile.function || ""
      }
    };
  }

  const hasError = () => defaultResource.hasError;

  const isDirty = () =>
    (profile.subscription || "*") !== defaultResource.parts.subscriptionId ||
    (profile.boundary || "") !== defaultResource.parts.boundaryId ||
    (profile.function || "") !== defaultResource.parts.functionId;

  const handleSave = () => {
    if (defaultResource.parts.subscriptionId === "*") {
      delete profile.subscription;
      delete profile.boundary;
      delete profile.function;
    } else {
      profile.subscription = defaultResource.parts.subscriptionId;
      if (defaultResource.parts.boundaryId) {
        profile.boundary = defaultResource.parts.boundaryId;
        if (defaultResource.parts.functionId) {
          profile.function = defaultResource.parts.functionId;
        } else {
          delete profile.function;
        }
      } else {
        delete profile.boundary;
        delete profile.function;
      }
    }
    saveProfile(profile);
  };

  return (
    <React.Fragment>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={12}>
          <Typography variant="h6">Settings</Typography>
        </Grid>
      </Grid>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={8}>
          <DialogContentText>Portal default view</DialogContentText>
          <FunctionResourceSelector
            resource={defaultResource}
            onResourceChange={(resource: any) => setDefaultResource(resource)}
          />
        </Grid>
        <Grid item xs={4}>
          <DialogContentText>&nbsp;</DialogContentText>
          <InfoCard>
            <DialogContentText>
              These settings determine the resource you will first see when you
              switch to this account.
            </DialogContentText>
          </InfoCard>
        </Grid>
      </Grid>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={8} className={classes.inputField}>
          <Button
            color="primary"
            variant="contained"
            disabled={!isDirty() || hasError()}
            onClick={handleSave}
          >
            Save
          </Button>
          <Button
            variant="text"
            color="primary"
            onClick={() => setDefaultResource(createInitialResource())}
            disabled={!isDirty()}
          >
            Reset
          </Button>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default AccountSettings;
