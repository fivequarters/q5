import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { useHistory } from "react-router-dom";
import CloneFunctionDialog from "./CloneFunctionDialog";
import EditMetadataDialog from "./EditMetadataDialog";
import { FunctionProvider, useFunction } from "./FunctionProvider";
import PortalError from "./PortalError";
import TemplateCard from "./TemplateCard";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
}));

function FunctionOverview({ subscriptionId, boundaryId, functionId }: any) {
  return (
    <FunctionProvider
      subscriptionId={subscriptionId}
      boundaryId={boundaryId}
      functionId={functionId}
    >
      <FunctionOverviewImpl />
    </FunctionProvider>
  );
}

function FunctionOverviewImpl() {
  const [cloneOpen, setCloneOpen] = React.useState(false);
  const [editMetadataOpen, setEditMetadataOpen] = React.useState(false);
  const history = useHistory();
  const classes = useStyles();
  const [func] = useFunction();

  const handleEditCode = () => {
    history.replace("code");
  };

  return (
    <Grid container className={classes.gridContainer}>
      <Grid item xs={12}>
        {func.status === "error" && <PortalError error={func.error} />}
        {(func.status === "updating" || func.status === "loading") && (
          <LinearProgress />
        )}
        {func.status === "ready" && (
          <TemplateCard
            template={
              (func.existing.metadata && func.existing.metadata.template) || {
                name: func.functionId,
                description: "Custom function"
              }
            }
            installed
            onEditCode={handleEditCode}
            onEditMetadata={() => setEditMetadataOpen(true)}
            onClone={() => setCloneOpen(true)}
          />
        )}
        {cloneOpen && (
          <CloneFunctionDialog
            onClose={() => setCloneOpen(false)}
            subscriptionId={func.subscriptionId}
            boundaryId={func.boundaryId}
            functionId={func.functionId}
          />
        )}
        {editMetadataOpen && (
          <EditMetadataDialog onClose={() => setEditMetadataOpen(false)} />
        )}
      </Grid>
    </Grid>
  );
}

export default FunctionOverview;
