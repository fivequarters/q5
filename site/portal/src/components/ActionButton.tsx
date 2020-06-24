import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';

const useStyles = makeStyles((theme: any) => ({
  actionButton: {
    marginLeft: theme.spacing(5),
  },
}));

function ActionButton({ children, ...rest }: any) {
  const classes = useStyles();

  return (
    <Button variant="outlined" color="primary" className={classes.actionButton} {...rest}>
      {children}
    </Button>
  );
}

export default ActionButton;
