import Paper from "@material-ui/core/Paper";
import { lighten, makeStyles } from "@material-ui/core/styles";
import React from "react";

const useStyles = makeStyles((theme: any) => ({
  card: {
    minWidth: 400,
    width: "100%",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    minHeight: 114,
    height: 114
  },
  cardIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 114,
    minWidth: 114,
    backgroundColor: lighten(theme.palette.primary.light, 0.75),
    fontSize: 70
  },
  cardContent: {
    width: "100%",
    paddingLeft: theme.spacing(4),
    display: "flex",
    alignItems: "center"
  },
  cardAction: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    width: 114,
    minWidth: 114
  }
}));

function EntityCard({ icon, actions, children, ...rest }: any) {
  const classes = useStyles();
  return (
    <Paper className={classes.card} square={true} {...rest}>
      <div className={classes.cardIcon}>{icon}</div>
      <div className={classes.cardContent}>{children}</div>
      <div className={classes.cardAction}>{actions}</div>
    </Paper>
  );
}

export default EntityCard;
