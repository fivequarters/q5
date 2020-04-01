import React from "react";
import ActionFab from "./ActionFab";
import { useFunction } from "./FunctionProvider";
import MenuIcon from "@material-ui/icons/Menu";
import EditIcon from "@material-ui/icons/Edit";
import Fab from "@material-ui/core/Fab";
import { makeStyles } from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/LinearProgress";
import DialogContentText from "@material-ui/core/DialogContentText";
import { useHistory } from "react-router-dom";
import CloneFunctionDialog from "./CloneFunctionDialog";
import EditMetadataDialog from "./EditMetadataDialog";
import ConfirmationDialog from "./ConfirmationDialog";
import { useProfile } from "./ProfileProvider";
import { deleteFunctions } from "../lib/Fusebit";
import { useBoundaries, reloadBoundaries } from "./BoundariesProvider";
import { FusebitError } from "./ErrorBoundary";

const useStyles = makeStyles((theme: any) => ({
  root: {
    display: "flex"
  },
  icon: {
    color: "white",
    marginRight: theme.spacing(2)
  }
}));

function FunctionActionFab() {
  const classes = useStyles();
  const [cloneOpen, setCloneOpen] = React.useState(false);
  const [editMetadataOpen, setEditMetadataOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<any>({
    status: "closed"
  });
  const history = useHistory();
  const { profile } = useProfile();
  const [func] = useFunction();
  const [boundaries, setBoundaries] = useBoundaries();

  React.useEffect(() => {
    if (confirmDelete.status === "initiating") {
      (async () => {
        setConfirmDelete({ status: "deleting" });
        try {
          await deleteFunctions(profile, func.subscriptionId, func.boundaryId, [
            func.functionId
          ]);
        } catch (e) {
          setBoundaries({
            status: "error",
            error: new FusebitError("Error deleting function", {
              details:
                (e.status || e.statusCode) === 403
                  ? "You are not authorized to delete this function."
                  : e.message || "Unknown error.",
              actions: [
                {
                  text: "Back to functions",
                  func: () => reloadBoundaries(boundaries, setBoundaries)
                }
              ]
            })
          });
          history.replace(`../../functions`);
          return;
        }
        reloadBoundaries(boundaries, setBoundaries);
        history.replace(`../../functions`);
      })();
    }
  }, [
    confirmDelete.status,
    boundaries,
    func.subscriptionId,
    func.boundaryId,
    func.functionId,
    history,
    profile,
    setBoundaries
  ]);

  const handleEditCode = () => {
    history.replace("code");
  };

  const handleDelete = (confirmed: boolean) => {
    if (confirmed) {
      setConfirmDelete({ status: "initiating" });
    } else {
      setConfirmDelete({ status: "closed" });
    }
  };

  return (
    <div className={classes.root}>
      <Fab color="secondary" className={classes.icon} onClick={handleEditCode}>
        <EditIcon />
      </Fab>
      <ActionFab
        color="default"
        icon={<MenuIcon />}
        actions={[
          {
            name: "Clone",
            handler: () => setCloneOpen(true)
          },
          {
            name: "Edit metadata",
            handler: () => setEditMetadataOpen(true)
          },
          {
            name: "Delete",
            handler: () => setConfirmDelete({ status: "open" })
          }
        ]}
      />
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
      <ConfirmationDialog
        open={confirmDelete.status !== "closed"}
        title={
          confirmDelete.status === "open" ? "Confirm delete" : "Deleting..."
        }
        content={
          confirmDelete.status === "open" ? (
            <DialogContentText>
              Delete function <strong>{func.functionId}</strong> in boundary{" "}
              <strong>{func.boundaryId}</strong>?
            </DialogContentText>
          ) : (
            <LinearProgress />
          )
        }
        onDone={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}

export default FunctionActionFab;
