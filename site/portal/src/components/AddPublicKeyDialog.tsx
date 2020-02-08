import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import React from "react";
import { modifyIssuer, useIssuer } from "./IssuerProvider";
import PublicKeyDetails from "./PublicKeyDetails";

function AddPublicKeyDialog({ onClose }: any) {
  const [issuer, setIssuer] = useIssuer();
  const [addPublicKey, setAddPublicKey] = React.useState<any>({
    keyId: "",
    publicKey: ""
  });

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
    if (issuer.status === "ready") {
      let newPublicKeys = [...(issuer.modified.publicKeys || [])];
      newPublicKeys.push({
        keyId: addPublicKey.keyId.trim(),
        publicKey: addPublicKey.publicKey.trim()
      });
      modifyIssuer(issuer, setIssuer, {
        ...issuer.modified,
        publicKeys: newPublicKeys
      });
      onClose && onClose();
    }
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
        <PublicKeyDetails
          publicKey={addPublicKey}
          onPublicKeyChanged={(publicKey: any) => setAddPublicKey(publicKey)}
          existingPublicKeys={
            issuer.status === "ready" || issuer.status === "updating"
              ? issuer.modified.publicKeys
              : []
          }
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
