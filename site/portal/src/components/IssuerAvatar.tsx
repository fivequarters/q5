import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';

const useStyles = makeStyles(theme => ({
  avatar: {
    display: 'inline-flex',
    width: 32,
    height: 32,
    marginRight: theme.spacing(1),
  },
}));

function IssuerAvatar({ id }: any) {
  const classes = useStyles();

  return (
    <Avatar className={classes.avatar}>
      <AccountBalanceIcon fontSize="small" />
    </Avatar>
  );
}

export default IssuerAvatar;
