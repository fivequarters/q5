import React from 'react';
import { MenuList, MenuItem, Typography, Button, makeStyles, Paper } from '@material-ui/core';
import SettingsApplicationsIcon from '@material-ui/icons/SettingsApplications';
import AssignmentIndIcon from '@material-ui/icons/AssignmentInd';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 200,
    height: '100%',
    backgroundColor: '#f3f3f3',
  },
  menuOption: {
    textTransform: 'capitalize',
    padding: theme.spacing(1),
  },
}));

export default function LateralMenu() {
  const styles = useStyles();
  return (
    <Paper className={styles.root}>
      <MenuList>
        <MenuItem>
          <Button href="/account" className={styles.menuOption}>
            <SettingsApplicationsIcon fontSize="small" />
            <Typography> Account settings</Typography>
          </Button>
        </MenuItem>

        <MenuItem>
          <Button href="/users" className={styles.menuOption}>
            <AssignmentIndIcon fontSize="small" />
            <Typography>Users</Typography>
          </Button>
        </MenuItem>
      </MenuList>
    </Paper>
  );
}
