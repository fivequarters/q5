import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import FingerprintIcon from "@material-ui/icons/Fingerprint";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import React from "react";
import { PublicKey } from "../lib/FusebitTypes";
import AddPublicKeyDialog from "./AddPublicKeyDialog";
import ConfirmNavigation from "./ConfirmNavigation";
import EntityCard from "./EntityCard";
import { FusebitError } from "./ErrorBoundary";
import InfoCard from "./InfoCard";
import InputWithIcon from "./InputWithIcon";
import IssuerNameInput from "./IssuerNameInput";
import { modifyIssuer, saveIssuer, useIssuer } from "./IssuerProvider";
import JwksUrlInput from "./JwksUrlInput";
import PortalError from "./PortalError";
import PublicKeyAcquisitionSelector from "./PublicKeyAcquisitionSelector";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
    marginBottom: theme.spacing(2)
  },
  keyContainer: {
    paddingLeft: theme.spacing(1) + 24,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    minWidth: 480
  },
  keyAction: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  },
  actions: {
    marginLeft: theme.spacing(4)
  }
}));

function IssuerProperties() {
  const classes = useStyles();
  const [issuer, setIssuer] = useIssuer();
  const [addPublicKeyDialogOpen, setAddPublicKeyDialogOpen] = React.useState(
    false
  );

  if (issuer.status === "loading") {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <LinearProgress />
        </Grid>
      </Grid>
    );
  }

  if (issuer.status === "error") {
    return (
      <Grid container className={classes.gridContainer} spacing={2}>
        <Grid item xs={12}>
          <PortalError error={issuer.error} />
        </Grid>
      </Grid>
    );
  }

  const handleRemovePublicKey = (pki: any) => {
    let newPublicKeys: PublicKey[] = [];
    (issuer.modified.publicKeys || []).forEach(p => {
      if (p !== pki) {
        newPublicKeys.push(p);
      }
    });
    modifyIssuer(issuer, setIssuer, {
      ...issuer.modified,
      publicKeys: newPublicKeys
    });
  };

  const isError = () => {
    return !!(
      issuer.modified.publicKeyAcquisition === "jwks" &&
      issuer.modified.jsonKeysUrlError
    );
  };

  const handleSave = () =>
    saveIssuer(
      issuer,
      setIssuer,
      e =>
        new FusebitError(`Error updating issuer ${issuer.issuerId}`, {
          details:
            (e.status || e.statusCode) === 403
              ? `You are not authorized to access issuer information.`
              : e.message || "Unknown error.",
          source: "IssuerProperties"
        })
    );

  const handleReset = () =>
    modifyIssuer(
      issuer,
      setIssuer,
      JSON.parse(JSON.stringify(issuer.existing))
    );

  function PublicKeys() {
    if (issuer.status === "ready" || issuer.status === "updating") {
      return (
        <div className={classes.keyContainer}>
          <div>
            {!issuer.modified.publicKeys ||
            issuer.modified.publicKeys.length === 0 ? (
              <Typography>
                No public keys are stored. You can provide up to three stored
                public keys.
              </Typography>
            ) : (
              <Typography>
                You can provide up to three stored public keys.
              </Typography>
            )}
          </div>
          {issuer.modified.publicKeys &&
            issuer.modified.publicKeys.map((pki: any) => (
              <EntityCard
                key={pki.keyId}
                actions={
                  <Button
                    variant="text"
                    onClick={() => handleRemovePublicKey(pki)}
                    disabled={issuer.status === "updating"}
                  >
                    Remove
                  </Button>
                }
                icon={<VpnKeyIcon fontSize="inherit" color="secondary" />}
              >
                <div>
                  <Typography variant="h6">{pki.keyId}</Typography>
                </div>
              </EntityCard>
            ))}
          <div className={classes.keyAction}>
            <Button
              variant="outlined"
              color="secondary"
              disabled={
                (issuer.modified.publicKeys &&
                  issuer.modified.publicKeys.length >= 3) ||
                issuer.status === "updating"
              }
              onClick={() => setAddPublicKeyDialogOpen(true)}
            >
              Add public key
            </Button>
          </div>
          {addPublicKeyDialogOpen && (
            <AddPublicKeyDialog
              onClose={() => setAddPublicKeyDialogOpen(false)}
            />
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <React.Fragment>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={8} className={classes.form}>
          <form noValidate autoComplete="off">
            <InputWithIcon icon={<FingerprintIcon />}>
              <TextField
                id="issuerId"
                label="Issuer ID"
                variant="outlined"
                disabled
                value={issuer.existing.id}
                helperText="This is the value of the iss claim in the JWT access token"
                fullWidth
              />
            </InputWithIcon>
            <IssuerNameInput autoFocus />
            <PublicKeyAcquisitionSelector />
            {issuer.modified.publicKeyAcquisition === "jwks" && (
              <JwksUrlInput />
            )}
            {issuer.modified.publicKeyAcquisition === "pki" && <PublicKeys />}
          </form>
        </Grid>
        <Grid item xs={4}>
          <InfoCard learnMoreUrl="https://fusebit.io/docs/integrator-guide/authz-model/#registering-an-issuer">
            Fusebit validates the signature of the access tokens created by this
            issuer using a public key. The public key can be stored in the
            system or retrieved automatically from a JWKS endpoint.
          </InfoCard>
        </Grid>
        {issuer.dirty && <ConfirmNavigation />}
        {/* {issuer.dirty && <SaveFab onClick={handleSave} disabled={isError()} />} */}
      </Grid>
      <Grid container spacing={2} className={classes.gridContainer}>
        <Grid item xs={8} className={classes.form}>
          <Button
            color="primary"
            variant="contained"
            disabled={!issuer.dirty || isError()}
            onClick={handleSave}
            className={classes.actions}
          >
            Save
          </Button>
          <Button
            variant="text"
            color="primary"
            onClick={handleReset}
            disabled={!issuer.dirty}
          >
            Reset
          </Button>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default IssuerProperties;
