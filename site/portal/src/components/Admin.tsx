import React from "react";
import {
  getLocalSettings,
  setLocalSettings,
  IFusebitSettings
} from "../lib/Settings";
import { makeStyles } from "@material-ui/core/styles";
import { useProfile } from "./ProfileProvider";
import ProfileSelector from "./ProfileSelector";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex"
  }
}));

function Admin({ ...rest }) {
  const { profile, logout } = useProfile();
  const classes = useStyles();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const settings = getLocalSettings() as IFusebitSettings;

  const handleSelectProfile = (id: string) => {
    settings.currentProfile = id;
    setLocalSettings(settings);
    window.location.href = "/";
  };

  return (
    <div className={classes.root}>
      <ProfileSelector
        settings={settings}
        open={drawerOpen}
        onSetDrawerOpen={(open: boolean) => setDrawerOpen(open)}
        onSelectProfile={handleSelectProfile}
      />
    </div>
  );
}

export default Admin;
