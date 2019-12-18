import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import ProfileSelector from "./ProfileSelector";
import { setLocalSettings } from "../lib/Settings";

const useStyles = makeStyles((theme: any) => ({
  root: {
    display: "flex"
  },
  details: {
    minWidth: 600,
    marginLeft: 70,
    width: "calc(100% - 70px)"
  }
}));

function ProfileSelectorWithDetails({ children, settings }: any) {
  const classes = useStyles();

  const handleSelectProfile = (id: string) => {
    settings.currentProfile = id;
    setLocalSettings(settings);
    window.location.href = "/";
  };

  return (
    <div className={classes.root}>
      <ProfileSelector
        settings={settings}
        onSelectProfile={handleSelectProfile}
      />
      <div className={classes.details}>{children}</div>
    </div>
  );
}

export default ProfileSelectorWithDetails;
