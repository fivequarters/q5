import React, { useState } from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MenuIcon from '@material-ui/icons/Menu';
import { FusebitMarkInverted } from '@5qtrs/fusebit-mark-inverted';
import SelectableAvatar from './SelectableAvatar';

const useStyles = makeStyles((theme: any) => ({
  drawer: {
    whiteSpace: 'nowrap',
  },
  details: {
    marginRight: 16,
    marginTop: 8,
  },
  avatar: {
    marginTop: 0,
    marginLeft: 8,
    marginRight: 8,
  },
  paper: {
    background: theme.fusebit.colors.black,
  },
  typography: {
    color: theme.palette.getContrastText(theme.fusebit.colors.black),
  },
}));

function ProfileSelector({ onSelectProfile, settings }: any) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const theme = useTheme() as any;

  const handleDrawerToggle = () => setOpen(!open);

  const handleSelectProfile = (id: string) => {
    onSelectProfile && id !== settings.currentProfile && onSelectProfile(id);
  };

  function renderProfileList(details: boolean) {
    return (
      <List disablePadding={true}>
        {settings.profiles.map((profile: any, index: number) => (
          <ListItem
            button
            alignItems="flex-start"
            key={profile.id}
            disableGutters={true}
            onClick={() => handleSelectProfile(profile.id as string)}
          >
            <SelectableAvatar className={classes.avatar} selected={profile.id === settings.currentProfile}>
              {!profile.icon && (
                <FusebitMarkInverted
                  size={38}
                  margin={0}
                  color={
                    theme.fusebit.profileSelector.iconColors[index % theme.fusebit.profileSelector.iconColors.length]
                  }
                />
              )}
              {profile.icon && <img src={profile.icon} width="38" height="38" alt="Profile icon" />}
            </SelectableAvatar>
            {details && (
              <ListItemText
                disableTypography
                className={classes.details}
                primary={
                  <Typography component="div" variant="subtitle1" className={classes.typography}>
                    {profile.displayName}
                  </Typography>
                }
                primaryTypographyProps={{ className: classes.typography }}
                secondary={
                  <React.Fragment>
                    <Typography component="div" variant="caption" className={classes.typography}>
                      <br></br>Deployment
                    </Typography>
                    <Typography component="div" variant="subtitle2" className={classes.typography}>
                      {profile.baseUrl.replace(/^https:\/\//i, '')}
                    </Typography>
                    <Typography component="div" variant="caption" className={classes.typography}>
                      <br></br>Account ID
                    </Typography>
                    <Typography component="div" variant="subtitle2" className={classes.typography}>
                      {profile.account}
                    </Typography>
                  </React.Fragment>
                }
              />
            )}
          </ListItem>
        ))}
      </List>
    );
  }

  return (
    <React.Fragment>
      <Drawer
        variant="permanent"
        onClose={handleDrawerToggle}
        open={true}
        className={classes.drawer}
        classes={{ paper: classes.paper }}
      >
        {renderProfileList(false)}
        <IconButton onClick={handleDrawerToggle} className={classes.typography}>
          <MenuIcon />
        </IconButton>
      </Drawer>
      <Drawer
        variant="temporary"
        onClose={handleDrawerToggle}
        open={open}
        className={classes.drawer}
        classes={{ paper: classes.paper }}
      >
        {renderProfileList(true)}
      </Drawer>
    </React.Fragment>
  );
}

export default ProfileSelector;
