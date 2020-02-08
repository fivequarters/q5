import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import React from "react";
import InputWithIcon from "./InputWithIcon";
import { modifyIssuer, useIssuer } from "./IssuerProvider";

function PublicKeyAcquisitionSelector() {
  const [issuer, setIssuer] = useIssuer();

  const handlePublicKeyAcquisitionChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    if (issuer.status === "ready") {
      issuer.modified.publicKeyAcquisition =
        event.target.value === "pki" ? "pki" : "jwks";
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
    }
  };

  if (issuer.status === "ready" || issuer.status === "updating") {
    return (
      <InputWithIcon icon={<VpnKeyIcon />}>
        <FormControl fullWidth>
          <InputLabel htmlFor="publicKeyAcquisition">
            Public Key Acquisition
          </InputLabel>
          <Select
            id="publicKeyAcquisition"
            value={issuer.modified.publicKeyAcquisition}
            onChange={handlePublicKeyAcquisitionChange}
            disabled={issuer.status === "updating"}
          >
            <MenuItem value={"pki"}>Stored Public Key</MenuItem>
            <MenuItem value={"jwks"}>JWKS Endpoint</MenuItem>
          </Select>
        </FormControl>
      </InputWithIcon>
    );
  }
  return null;
}

export default PublicKeyAcquisitionSelector;
