import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles(theme => ({
  avatar: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    display: "inline-flex",
    width: 32,
    height: 32,
    marginRight: theme.spacing(1)
  }
}));

function UserAvatar({ letter }: any) {
  const classes = useStyles();

  return (
    <Avatar className={classes.avatar}>
      <Typography variant="body1">{letter}</Typography>
    </Avatar>
  );
}

export default UserAvatar;
