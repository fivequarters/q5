import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import React from "react";

function AddPublicKeyDialog({ onClose, issuer }: any) {
  const [addPublicKey, setAddPublicKey] = React.useState<any>({
    keyId: "",
    publicKey: ""
  });

  const handleKeyIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addPublicKey.keyId = event.target.value;
    const trimmed = addPublicKey.keyId.trim();
    const exists = issuer.publicKeys.reduce(
      (exists: boolean, current: any) => exists || current.keyId === trimmed,
      false
    );
    if (exists) {
      addPublicKey.keyIdError =
        "A public key with the same key ID already exists";
    } else if (trimmed.length === 0) {
      addPublicKey.keyIdError =
        "Required. The value of the kid claim in the header of the JWT access token";
    } else {
      delete addPublicKey.keyIdError;
    }
    setAddPublicKey({ ...addPublicKey });
  };

  const handlePublicKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    addPublicKey.publicKey = event.target.value;
    const trimmed = addPublicKey.publicKey.trim();
    if (trimmed.length === 0) {
      addPublicKey.publicKeyError = "Required. PEM-formatted public key";
    } else if (
      !trimmed.match(/^-----BEGIN.+PUBLIC KEY-----/) ||
      !trimmed.match(/-----END.+PUBLIC KEY-----$/)
    ) {
      addPublicKey.publicKeyError =
        "Invalid format. The public key must be provided in PEM format";
    } else {
      delete addPublicKey.publicKeyError;
    }
    setAddPublicKey({ ...addPublicKey });
  };

  const hasError = () =>
    !!(
      addPublicKey.keyIdError ||
      addPublicKey.publicKeyError ||
      !addPublicKey.keyId ||
      !addPublicKey.keyId.trim() ||
      !addPublicKey.publicKey ||
      !addPublicKey.publicKey.trim()
    );

  const handleSubmit = () => {
    onClose &&
      onClose({
        keyId: addPublicKey.keyId.trim(),
        publicKey: addPublicKey.publicKey.trim()
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
      <DialogTitle id="form-dialog-title">Add Public Key</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="keyId"
          label="Key ID"
          variant="filled"
          helperText={
            addPublicKey.keyIdError ||
            "The value of the kid claim in the header of the JWT access token"
          }
          fullWidth
          error={!!addPublicKey.keyIdError}
          value={addPublicKey.keyId}
          onChange={handleKeyIdChange}
        />
        <TextField
          margin="dense"
          id="publicKey"
          label="Public Key"
          variant="filled"
          helperText={addPublicKey.publicKeyError || "PEM-formatted public key"}
          error={!!addPublicKey.publicKeyError}
          value={addPublicKey.publicKey}
          onChange={handlePublicKeyChange}
          placeholder="-----BEGIN PUBLIC KEY-----....-----END PUBLIC KEY-----"
          fullWidth
          multiline
          rows={5}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onClose && onClose()}
          // color="primary"
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" disabled={hasError()}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddPublicKeyDialog;
