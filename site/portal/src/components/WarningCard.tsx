import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import WarningIcon from "@material-ui/icons/Warning";
import React from "react";

const useStyles = makeStyles((theme: any) => ({
  card: (props: any) => ({
    minWidth: 200,
    width: "100%",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    // minHeight: 114,
    // height: 114,
    backgroundColor:
      props.color === "primary"
        ? theme.palette.primary.main
        : theme.palette.secondary.main
  }),
  cardIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    minWidth: 70,
    fontSize: 18,
    color: "white"
  },
  cardContent: {
    width: "100%",
    padding: theme.spacing(1),
    paddingRight: theme.spacing(3),
    paddingLeft: 0,
    display: "inline-block",
    alignItems: "center",
    color: "white"
  }
}));

function WarningCard({ icon, children, color, ...rest }: any) {
  const classes = useStyles({ color });
  return (
    <Paper className={classes.card} elevation={0} {...rest}>
      <div className={classes.cardIcon}>{icon || <WarningIcon />}</div>
      <div className={classes.cardContent}>{children}</div>
    </Paper>
  );
}

export default WarningCard;
