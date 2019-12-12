import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import ProfileSelector from "./ProfileSelector";
import { setLocalSettings } from "../lib/Settings";
import clsx from "clsx";

const useStyles = makeStyles((theme: any) => ({
  root: {
    display: "flex"
  },
  details: {
    minWidth: 600,
    width: "calc(100% - 66px)",
    transition: theme.transitions.create(["width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    display: "block"
  },
  detailsShift: {
    marginLeft: 12,
    width: `calc(100% - ${theme.fusebit.profileSelector.width}px)`,
    transition: theme.transitions.create(["width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    })
  }
}));

function ProfileSelectorWithDetails({ children, settings }: any) {
  const classes = useStyles();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleSetDrawerOpen = (open: boolean) => {
    setDrawerOpen(open);
  };

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
        onSetDrawerOpen={handleSetDrawerOpen}
        onSelectProfile={handleSelectProfile}
      />
      <div
        className={clsx(classes.details, {
          [classes.detailsShift]: drawerOpen
        })}
      >
        {children}
      </div>
    </div>
  );
}

export default ProfileSelectorWithDetails;
