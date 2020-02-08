import TextField from "@material-ui/core/TextField";
import LabelIcon from "@material-ui/icons/Label";
import React from "react";
import InputWithIcon from "./InputWithIcon";
import { modifyIssuer, useIssuer } from "./IssuerProvider";

function IssuerNameInput({ ...rest }: any) {
  const [issuer, setIssuer] = useIssuer();

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (issuer.status === "ready") {
      issuer.modified.displayName = event.target.value;
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
    }
  };

  if (issuer.status === "ready" || issuer.status === "updating") {
    return (
      <InputWithIcon icon={<LabelIcon />}>
        <TextField
          id="issuerName"
          label="Name"
          variant="outlined"
          placeholder="Friendly display name..."
          value={issuer.modified.displayName || ""}
          onChange={handleNameChange}
          fullWidth
          // autoFocus
          disabled={issuer.status === "updating"}
          {...rest}
        />
      </InputWithIcon>
    );
  }
  return null;
}

export default IssuerNameInput;
