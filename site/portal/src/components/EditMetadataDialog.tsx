import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import TextField from "@material-ui/core/TextField";
import React from "react";
import { modifyFunction, saveFunction, useFunction } from "./FunctionProvider";
import PortalError from "./PortalError";

function EditMetadataDialog({ onClose }: any) {
  const [func, setFunc] = useFunction();
  const [data, setData] = React.useState<any>(undefined);

  React.useEffect(() => {
    if (!data && func.status === "ready") {
      setData({
        metadataSerialized: JSON.stringify(
          func.modified.metadata || {},
          null,
          2
        ),
        metadataError: undefined
      });
    }
  }, [data, func]);

  const formatHint = "Metadata must be a JSON object.";

  const handleMetadataChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let data: any = { metadataSerialized: event.target.value };
    let metadata: any;
    try {
      metadata = JSON.parse(data.metadataSerialized);
      delete data.metadataError;
    } catch (e) {
      data.metadataError = `Input is not a valid JSON. ${formatHint}`;
    }
    if (!data.metadataError && typeof metadata !== "object") {
      data.metadataError = `Input is not a JSON object. ${formatHint}`;
    }
    setData({ ...data });
  };

  const hasError = () => data && !!data.metadataError;

  const handleSubmit = async () => {
    if (func.status === "ready") {
      func.modified.metadata = JSON.parse(data.metadataSerialized);
      modifyFunction(func, setFunc, { ...func.modified });
      saveFunction(func, setFunc, undefined, e => !e && onClose && onClose());
    }
  };

  return (
    <Dialog
      open={true}
      onClose={() => func.status === "ready" && onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="md"
      fullWidth
    >
      <DialogTitle id="form-dialog-title">Edit function metadata</DialogTitle>
      {(func.status === "ready" || func.status === "updating") && (
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="metadata"
            label="Metadata"
            variant="filled"
            helperText={(data && data.metadataError) || formatHint}
            fullWidth
            multiline
            rows={14}
            error={hasError()}
            value={(data && data.metadataSerialized) || ""}
            onChange={handleMetadataChange}
            disabled={func.status !== "ready"}
          />
        </DialogContent>
      )}
      {func.status === "error" && (
        <DialogContent>
          <PortalError error={func.error} />
        </DialogContent>
      )}
      {func.status === "loading" && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      <DialogActions>
        <Button
          onClick={() => onClose && onClose()}
          disabled={func.status === "updating"}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={func.status !== "ready" || hasError()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditMetadataDialog;
