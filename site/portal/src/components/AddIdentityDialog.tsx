import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import React from "react";

function AddIdentityDialog({ onClose }: any) {
  const [addIdentity, setAddIdentity] = React.useState<any>({
    issuerId: "",
    subject: ""
  });

  const handleIssuerIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addIdentity.issuerId = event.target.value;
    const trimmed = addIdentity.issuerId.trim();
    if (trimmed.length === 0) {
      addIdentity.issuerIdError =
        "Required. The value of the iss claim in the JWT access token";
    } else {
      delete addIdentity.issuerIdError;
    }
    setAddIdentity({ ...addIdentity });
  };

  const handleSubjectChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addIdentity.subject = event.target.value;
    const trimmed = addIdentity.subject.trim();
    if (trimmed.length === 0) {
      addIdentity.subjectError =
        "Required. The value of the sub claim in the JWT access token";
    } else {
      delete addIdentity.subjectError;
    }
    setAddIdentity({ ...addIdentity });
  };

  const hasError = () =>
    !!(
      addIdentity.issuerIdError ||
      addIdentity.subjectError ||
      !addIdentity.issuerId ||
      !addIdentity.issuerId.trim() ||
      !addIdentity.subject ||
      !addIdentity.subject.trim()
    );

  const handleSubmit = () => {
    onClose &&
      onClose({
        issuerId: addIdentity.issuerId.trim(),
        subject: addIdentity.subject.trim()
      });
  };

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="form-dialog-title">Add Identity</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="issuerId"
          label="Issuer ID"
          variant="filled"
          helperText={
            addIdentity.issuerIdError ||
            "The value of the iss claim in the JWT access token"
          }
          fullWidth
          error={!!addIdentity.issuerIdError}
          value={addIdentity.issuerId}
          onChange={handleIssuerIdChange}
        />
        <TextField
          margin="dense"
          id="subject"
          label="Subject"
          variant="filled"
          helperText={
            addIdentity.subjectError ||
            "The value of the sub claim in the JWT access token"
          }
          error={!!addIdentity.subjectError}
          value={addIdentity.subject}
          onChange={handleSubjectChange}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          disabled={hasError()}
          variant="contained"
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddIdentityDialog;
