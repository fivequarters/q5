import Fab from '@material-ui/core/Fab';
import { makeStyles } from '@material-ui/core/styles';
import SaveIcon from '@material-ui/icons/Save';
import React from 'react';

const useStyles = makeStyles((theme: any) => ({
  fab: {
    position: 'fixed',
    bottom: theme.spacing(6),
    right: theme.spacing(10),
  },
  fabIcon: {
    marginRight: theme.spacing(1),
  },
}));

function SaveFab({ ...rest }) {
  const classes = useStyles();
  return (
    <Fab color="primary" variant="extended" className={classes.fab} {...rest}>
      <SaveIcon className={classes.fabIcon} />
      Save
    </Fab>
  );
}

export default SaveFab;
