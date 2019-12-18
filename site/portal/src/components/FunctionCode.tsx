import React from "react";
import FusebitEditor from "./FusebitEditor";
import { makeStyles } from "@material-ui/core/styles";
import { useProfile } from "./ProfileProvider";
import Grid from "@material-ui/core/Grid";
// import Paper from "@material-ui/core/Paper";
// import Tabs from "@material-ui/core/Tabs";
// import Tab from "@material-ui/core/Tab";
// import { FusebitError } from "./ErrorBoundary";

const useStyles = makeStyles(theme => ({
  gridItem: {
    position: "relative",
    height: "calc(100vh - 93px)"
  },
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0
  }
}));

function FunctionCode({ data, match }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const { params } = match;
  const { accountId, subscriptionId, boundaryId, functionId } = params;

  return (
    <Grid container>
      <Grid item xs={12} className={classes.gridItem}>
        <div className={classes.container}>
          <FusebitEditor
            version="1"
            boundaryId={boundaryId}
            functionId={functionId}
            account={{
              accountId: accountId,
              subscriptionId: subscriptionId,
              baseUrl: profile.baseUrl,
              accessToken: profile.auth && profile.auth.access_token
            }}
            options={{
              template: {},
              editor: {
                ensureFunctionExists: true,
                theme: "light"
              }
            }}
            onLoaded={(editorContext: any) => {}}
            onError={(e: any) => {
              throw e;
            }}
          />
        </div>
      </Grid>
    </Grid>
  );
}

export default FunctionCode;
