import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import React from "react";
import FunctionNameSelector from "./FunctionNameSelector";
import { useProfile } from "./ProfileProvider";
import LinearProgress from "@material-ui/core/LinearProgress";
import { getFunction, createFunction } from "../lib/Fusebit";
import PortalError from "./PortalError";
import { Link as RouterLink } from "react-router-dom";
import { reloadBoundaries, useBoundaries } from "./BoundariesProvider";

function CloneFunctionDialog({
  subscriptionId,
  boundaryId,
  functionId,
  onClose
}: any) {
  const [name, setName] = React.useState<any>({
    functionId: "",
    boundaryId: "",
    disabled: true
  });
  const [state, setState] = React.useState<any>({
    status: "initial"
  });
  const { profile } = useProfile();
  const [boundaries, setBoundaries] = useBoundaries();

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (state.status === "cloning") {
      (async () => {
        try {
          const functionSpecification = await getFunction(
            profile,
            subscriptionId,
            boundaryId,
            functionId
          );
          delete functionSpecification.id;
          delete functionSpecification.boundaryId;
          await createFunction(
            profile,
            subscriptionId,
            name.boundaryId,
            name.functionId,
            functionSpecification
          );
          reloadBoundaries(boundaries, setBoundaries);
          !cancelled && setState({ status: "success" });
        } catch (error) {
          !cancelled && setState({ status: "error", error });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [
    state,
    profile,
    name,
    boundaries,
    setBoundaries,
    boundaryId,
    subscriptionId,
    functionId
  ]);

  const handleClone = () => {
    setState({ status: "cloning" });
  };

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="form-dialog-title">Clone function</DialogTitle>
      {state.status === "initial" && (
        <DialogContent>
          <DialogContentText>
            Choose the boundary name and function name to create a clone of
            function <strong>{functionId}</strong> from boundary{" "}
            <strong>{boundaryId}.</strong>
          </DialogContentText>
          <FunctionNameSelector
            subscriptionId={subscriptionId}
            boundaryEnabled={true}
            name={name}
            onNameChange={(newName: any) => setName(newName)}
          />
        </DialogContent>
      )}
      {state.status === "cloning" && (
        <DialogContent>
          <DialogContentText>
            Cloning function <strong>{functionId}</strong> in boundary{" "}
            <strong>{boundaryId}</strong> to function{" "}
            <strong>{name.functionId}</strong> in boundary{" "}
            <strong>{name.boundaryId}</strong>.
          </DialogContentText>
          <LinearProgress />
        </DialogContent>
      )}
      {state.status === "success" && (
        <DialogContent>
          <DialogContentText>
            Successfuly cloned function <strong>{functionId}</strong> in
            boundary <strong>{boundaryId}</strong> to function{" "}
            <strong>{name.functionId}</strong> in boundary{" "}
            <strong>{name.boundaryId}</strong>.
          </DialogContentText>
        </DialogContent>
      )}
      {state.status === "error" && (
        <DialogContent>
          <DialogContentText>
            Error cloning function <strong>{functionId}</strong> in boundary{" "}
            <strong>{boundaryId}</strong> to function{" "}
            <strong>{name.functionId}</strong> in boundary{" "}
            <strong>{name.boundaryId}</strong>.
          </DialogContentText>
          <PortalError error={state.error} />
        </DialogContent>
      )}
      <DialogActions>
        <Button
          onClick={() => onClose && onClose()}
          disabled={state.status === "cloning"}
        >
          Cancel
        </Button>
        {(state.status === "initial" || state.status === "cloning") && (
          <Button
            onClick={handleClone}
            color="primary"
            disabled={name.disabled || state.status === "cloning"}
            variant="contained"
          >
            Clone
          </Button>
        )}
        {state.status === "error" && (
          <Button
            onClick={() => onClose && onClose()}
            color="primary"
            variant="contained"
          >
            Done
          </Button>
        )}
        {state.status === "success" && (
          <Button
            to={`/accounts/${profile.account}/subscriptions/${subscriptionId}/boundaries/${name.boundaryId}/functions/${name.functionId}/overview`}
            component={RouterLink}
            color="primary"
            variant="contained"
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default CloneFunctionDialog;
