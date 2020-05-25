import React, { useState } from 'react';
import { makeStyles, useTheme, ThemeProvider, createMuiTheme, fade } from '@material-ui/core/styles';
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
  detailsPrimary: {
    marginLeft: theme.spacing(2),
    maxWidth: 275,
    overflow: 'hidden',
  },
  detailsSecondary: {
    marginLeft: theme.spacing(),
    maxWidth: 320,
    overflow: 'hidden',
    marginBottom: theme.spacing(),
  },
  listItem: {
    borderRadius: 10,
    paddingLeft: theme.spacing(),
    paddingRight: theme.spacing(),
    flexWrap: 'wrap',
    maxWidth: 345,
  },
  avatar: {
    marginTop: 0,
  },
  paper: {
    paddingTop: theme.spacing(3),
    paddingLeft: theme.spacing(),
    paddingRight: theme.spacing(),
    alignItems: 'center',
  },
  icon: {
    width: 38,
    height: 38,
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

  function darkTheme(theme: any) {
    // Create mini dark theme. Just setting `type` doesn't work per https://github.com/mui-org/material-ui/issues/15914#issuecomment-530697788
    return createMuiTheme({
      ...theme,
      palette: {
        ...theme.palette,
        text: {
          primary: theme.palette.common.white,
          secondary: fade(theme.palette.common.white, 0.7),
        },
        action: {
          active: theme.palette.common.white,
          hover: fade(theme.palette.common.white, 0.08),
          selected: fade(theme.palette.common.white, 0.16),
        },
        background: {
          ...theme.background,
          paper: theme.fusebit.colors.black,
        },
      },
    });
  }

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
            className={classes.listItem}
          >
            <SelectableAvatar className={classes.avatar} selected={profile.id === settings.currentProfile}>
              {!profile.icon && (
                <FusebitMarkInverted
                  size={32}
                  margin={0}
                  color={
                    theme.fusebit.profileSelector.iconColors[index % theme.fusebit.profileSelector.iconColors.length]
                  }
                />
              )}
              {profile.icon && <img src={profile.icon} width="32" height="32" alt="Profile icon" />}
            </SelectableAvatar>
            {details && (
              <>
                <ListItemText
                  className={classes.detailsPrimary}
                  primary={
                    <Typography component="div" variant="h6">
                      {profile.displayName}
                    </Typography>
                  }
                />
                <ListItemText
                  className={classes.detailsSecondary}
                  secondary={
                    <React.Fragment>
                      <Typography component="div" variant="body1">
                        Deployment:
                      </Typography>
                      <Typography component="div" variant="body1">
                        {profile.baseUrl.replace(/^https:\/\//i, '')}
                      </Typography>
                      <Typography component="div" variant="body1">
                        Account ID:
                      </Typography>
                      <Typography component="div" variant="body1">
                        {profile.account}
                      </Typography>
                    </React.Fragment>
                  }
                />
              </>
            )}
          </ListItem>
        ))}
      </List>
    );
  }

  return (
    <React.Fragment>
      <ThemeProvider theme={darkTheme}>
        <Drawer
          variant="permanent"
          onClose={handleDrawerToggle}
          open={true}
          className={classes.drawer}
          classes={{ paper: classes.paper }}
        >
          {renderProfileList(false)}
          <IconButton onClick={handleDrawerToggle} className={`${classes.icon}`} size="small">
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
      </ThemeProvider>
    </React.Fragment>
  );
}

export default ProfileSelector;
