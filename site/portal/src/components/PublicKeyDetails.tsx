import TextField from "@material-ui/core/TextField";
import React from "react";

function PublicKeyDetails({
  existingPublicKeys,
  publicKey,
  onPublicKeyChanged
}: any) {
  const handleKeyIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    publicKey.keyId = event.target.value;

    const trimmed = publicKey.keyId.trim();
    const exists = (existingPublicKeys || []).reduce(
      (exists: boolean, current: any) => exists || current.keyId === trimmed,
      false
    );
    if (exists) {
      publicKey.keyIdError = "A public key with the same key ID already exists";
    } else if (trimmed.length === 0) {
      publicKey.keyIdError =
        "Required. The value of the kid claim in the header of the JWT access token";
    } else {
      delete publicKey.keyIdError;
    }
    onPublicKeyChanged && onPublicKeyChanged({ ...publicKey });
  };

  const handlePublicKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    publicKey.publicKey = event.target.value;
    const trimmed = publicKey.publicKey.trim();
    if (trimmed.length === 0) {
      publicKey.publicKeyError = "Required. PEM-formatted public key";
    } else if (
      !trimmed.match(/^-----BEGIN.+PUBLIC KEY-----/) ||
      !trimmed.match(/-----END.+PUBLIC KEY-----$/)
    ) {
      publicKey.publicKeyError =
        "Invalid format. The public key must be provided in PEM format";
    } else {
      delete publicKey.publicKeyError;
    }
    onPublicKeyChanged && onPublicKeyChanged({ ...publicKey });
  };

  return (
    <React.Fragment>
      <TextField
        autoFocus
        margin="dense"
        id="keyId"
        label="Key ID"
        variant="filled"
        helperText={
          publicKey.keyIdError ||
          "The value of the kid claim in the header of the JWT access token"
        }
        fullWidth
        error={!!publicKey.keyIdError}
        value={publicKey.keyId}
        onChange={handleKeyIdChange}
      />
      <TextField
        margin="dense"
        id="publicKey"
        label="Public Key"
        variant="filled"
        helperText={publicKey.publicKeyError || "PEM-formatted public key"}
        error={!!publicKey.publicKeyError}
        value={publicKey.publicKey}
        onChange={handlePublicKeyChange}
        placeholder="-----BEGIN PUBLIC KEY-----....-----END PUBLIC KEY-----"
        fullWidth
        multiline
        rows={5}
      />
    </React.Fragment>
  );
}

export default PublicKeyDetails;
