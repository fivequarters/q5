import React from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import { FusebitMark } from "@5qtrs/fusebit-mark";
import SelectableAvatar from "./SelectableAvatar";
import clsx from "clsx";

const useStyles = makeStyles((theme: any) => ({
  drawer: {
    width: theme.fusebit.profileSelector.width,
    flexShrink: 0,
    whiteSpace: "nowrap"
  },
  drawerOpen: {
    width: theme.fusebit.profileSelector.width,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    overflowX: "hidden",
    width: 66
  },
  expanded: {
    display: "flex",
    justifyContent: "flex-end"
  },
  collapsed: {
    display: "flex",
    justifyContent: "center"
  },
  details: {
    marginRight: 16,
    marginTop: 8
  },
  avatar: {
    marginTop: 0,
    marginLeft: 8,
    marginRight: 8
  },
  paper: {
    background: theme.fusebit.colors.dark
  },
  typography: {
    color: theme.palette.getContrastText(theme.fusebit.colors.dark)
  }
}));

function ProfileSelector({
  open,
  onSetDrawerOpen,
  onSelectProfile,
  settings
}: any) {
  const classes = useStyles();
  const theme = useTheme() as any;

  const handleDrawerToggle = () => {
    onSetDrawerOpen && onSetDrawerOpen(!open);
  };

  const handleSelectProfile = (id: string) => {
    onSelectProfile && id !== settings.currentProfile && onSelectProfile(id);
  };

  return (
    <Drawer
      variant="permanent"
      open={open}
      className={clsx(classes.drawer, {
        [classes.drawerOpen]: open,
        [classes.drawerClose]: !open
      })}
      classes={{ paper: classes.paper }}
    >
      <List disablePadding={true}>
        {settings.profiles.map((profile: any, index: number) => (
          <ListItem
            button
            alignItems="flex-start"
            key={profile.id}
            disableGutters={true}
            onClick={() => handleSelectProfile(profile.id as string)}
          >
            <SelectableAvatar
              className={classes.avatar}
              size={50}
              selected={profile.id === settings.currentProfile}
            >
              <FusebitMark
                size={36}
                margin={2}
                color={
                  theme.fusebit.profileSelector.iconColors[
                    index % theme.fusebit.profileSelector.iconColors.length
                  ]
                }
              />
            </SelectableAvatar>
            {open && (
              <ListItemText
                disableTypography
                className={classes.details}
                primary={
                  <Typography
                    component="div"
                    variant="subtitle1"
                    className={classes.typography}
                  >
                    {profile.displayName}
                  </Typography>
                }
                primaryTypographyProps={{ className: classes.typography }}
                secondary={
                  <React.Fragment>
                    <Typography
                      component="div"
                      variant="caption"
                      className={classes.typography}
                    >
                      <br></br>Deployment
                    </Typography>
                    <Typography
                      component="div"
                      variant="subtitle2"
                      className={classes.typography}
                    >
                      {profile.baseUrl.replace(/^https:\/\//i, "")}
                    </Typography>
                    <Typography
                      component="div"
                      variant="caption"
                      className={classes.typography}
                    >
                      <br></br>Account ID
                    </Typography>
                    <Typography
                      component="div"
                      variant="subtitle2"
                      className={classes.typography}
                    >
                      {profile.account}
                    </Typography>
                  </React.Fragment>
                }
              />
            )}
          </ListItem>
        ))}
      </List>
      <div className={open ? classes.expanded : classes.collapsed}>
        <IconButton onClick={handleDrawerToggle} className={classes.typography}>
          {open ? <ChevronLeftIcon /> : <MoreHorizIcon />}
        </IconButton>
      </div>
    </Drawer>
  );
}

export default ProfileSelector;
