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
import IconButton from "@material-ui/core/IconButton";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import LinkIcon from "@material-ui/icons/Link";
import InputWithIcon from "./InputWithIcon";

const useStyles = makeStyles(theme => ({
  gridContainer: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  tile: {
    marginLeft: theme.spacing(3)
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
      {func.status === "error" && (
        <Grid item xs={12}>
          <PortalError error={func.error} />
        </Grid>
      )}
      {(func.status === "updating" || func.status === "loading") && (
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      )}
      {func.status === "ready" && (
        <Grid item xs={8}>
          <InputWithIcon icon={<LinkIcon />}>
            <TextField
              label="Function base URL"
              // margin="dense"
              variant="outlined"
              value={func.existing.location}
              fullWidth
              disabled={true}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        func.existing.location &&
                        navigator.clipboard.writeText(func.existing.location)
                      }
                      color="inherit"
                    >
                      <FileCopyIcon fontSize="inherit" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </InputWithIcon>
          <div className={classes.tile}>
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
          </div>
        </Grid>
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
  );
}

export default FunctionOverview;
