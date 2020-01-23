import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
// import { makeStyles } from "@material-ui/core/styles";
// import { useProfile } from "./ProfileProvider";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
// import Paper from "@material-ui/core/Paper";
// import Tabs from "@material-ui/core/Tabs";
// import Tab from "@material-ui/core/Tab";
// import { FusebitError } from "./ErrorBoundary";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}));

function FunctionOverview({ data, match }: any) {
  const history = useHistory();
  const classes = useStyles();
  // const { profile } = useProfile();
  // const classes = useStyles();
  // const { params } = match;

  const handleEditCode = () => {
    history.replace("code");
  };

  return (
    <Grid container className={classes.gridContainer}>
      <Grid item xs={12}>
        <Button color="primary" variant="contained" onClick={handleEditCode}>
          Edit Code
        </Button>
      </Grid>
    </Grid>
  );
}

export default FunctionOverview;
