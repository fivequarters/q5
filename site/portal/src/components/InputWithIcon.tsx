import { makeStyles } from '@material-ui/core/styles';
import React from 'react';

const useStyles = makeStyles((theme: any) => ({
  inputWithIcon: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: 'inline-flex',
    width: '100%',
  },
  inputWithIconIcon: {
    paddingTop: theme.spacing(2),
    minWidth: 24,
  },
  inputWithIconContent: {
    paddingLeft: theme.spacing(1),
    width: '100%',
  },
}));

function InputWithIcon({ children, icon }: any) {
  const classes = useStyles();
  return (
    <div className={classes.inputWithIcon}>
      <div className={classes.inputWithIconIcon}>{icon}</div>
      <div className={classes.inputWithIconContent}>{children}</div>
    </div>
  );
}

export default InputWithIcon;
