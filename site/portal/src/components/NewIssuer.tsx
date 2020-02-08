import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { FusebitError } from "./ErrorBoundary";
import IssuerNameInput from "./IssuerNameInput";
import {
  IssuerProvider,
  NewIssuerId,
  saveIssuer,
  useIssuer,
  modifyIssuer
} from "./IssuerProvider";
import JwksUrlInput from "./JwksUrlInput";
import PortalError from "./PortalError";
import PublicKeyAcquisitionSelector from "./PublicKeyAcquisitionSelector";
import PublicKeyDetails from "./PublicKeyDetails";
import InputWithIcon from "./InputWithIcon";
import FingerprintIcon from "@material-ui/icons/Fingerprint";

const useStyles = makeStyles((theme: any) => ({
  gridContainer: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3)
    // marginBottom: theme.spacing(2)
  },
  form: {
    overflow: "hidden"
  },
  stepper: {
    backgroundColor: "inherit"
  },
  inputField: {
    marginTop: theme.spacing(2)
  },
  description: {
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(4)
  }
}));

function NewIssuerImpl({ issuers, onClose }: any) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [issuer, setIssuer] = useIssuer();
  const [addPublicKey, setAddPublicKey] = React.useState<any>({
    keyId: "",
    publicKey: ""
  });

  const hasStep1Error = () =>
    (issuer.status === "ready" || issuer.status === "updating") &&
    (!!issuer.modified.idError || issuer.modified.id === NewIssuerId);

  const hasError = () =>
    (issuer.status === "ready" || issuer.status === "updating") &&
    ((issuer.modified.publicKeyAcquisition === "pki" &&
      !!(
        addPublicKey.keyIdError ||
        addPublicKey.publicKeyError ||
        !addPublicKey.keyId ||
        !addPublicKey.keyId.trim() ||
        !addPublicKey.publicKey ||
        !addPublicKey.publicKey.trim()
      )) ||
      (issuer.modified.publicKeyAcquisition === "jwks" &&
        !!issuer.modified.jsonKeysUrlError) ||
      hasStep1Error());

  const handleNextStep = () => {
    setActiveStep(activeStep + 1);
  };

  const handleSave = () => {
    if (issuer.status === "ready") {
      issuer.modified.publicKeys = [
        { keyId: addPublicKey.keyId, publicKey: addPublicKey.publicKey }
      ];
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
      saveIssuer(
        issuer,
        setIssuer,
        e =>
          new FusebitError(`Error creating issuer`, {
            details:
              (e.status || e.statusCode) === 403
                ? `You are not authorized to create issuers.`
                : e.message || "Unknown error.",
            source: "CreateNewIssuer"
          }),
        e => !e && onClose && onClose(true)
      );
    }
  };

  const handleIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (issuer.status === "ready") {
      const trimmed = event.target.value.trim();
      if (trimmed === "") {
        issuer.modified.idError =
          "Required. Issuer ID must match the value of the iss claim in the JWT access token";
      } else if (
        (issuers || []).reduce(
          (current: any, value: any) => current || value.id === trimmed,
          false
        )
      ) {
        issuer.modified.idError =
          "An issuer with this Issuer ID already exists. Issuer IDs must be unique in the system.";
      } else {
        delete issuer.modified.idError;
      }
      issuer.modified.id =
        event.target.value === "" ? NewIssuerId : event.target.value;
      modifyIssuer(issuer, setIssuer, { ...issuer.modified });
    }
  };

  if (
    issuer.status === "ready" ||
    issuer.status === "updating" ||
    issuer.status === "error"
  ) {
    return (
      <Dialog
        open={true}
        onClose={() => onClose && onClose()}
        aria-labelledby="form-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="form-dialog-title">Add issuer</DialogTitle>
        <Stepper
          activeStep={activeStep}
          color="inherit"
          className={classes.stepper}
        >
          <Step>
            <StepLabel>Set properties</StepLabel>
          </Step>
          <Step>
            <StepLabel>Configure public key</StepLabel>
          </Step>
        </Stepper>
        {activeStep === 0 && issuer.status !== "error" && (
          <DialogContent>
            <InputWithIcon icon={<FingerprintIcon />}>
              <TextField
                id="issuerId"
                label="Issuer ID"
                variant="outlined"
                onChange={handleIdChange}
                disabled={issuer.status === "updating"}
                autoFocus
                value={
                  issuer.modified.id === NewIssuerId ? "" : issuer.modified.id
                }
                helperText={
                  issuer.modified.idError ||
                  "Issuer ID must match the value of the iss claim in the JWT access token"
                }
                error={hasStep1Error()}
                fullWidth
              />
            </InputWithIcon>
            <IssuerNameInput helperText="Display Name" />
            <DialogContentText className={classes.description}>
              Fusebit validates the signature of the access tokens from this
              issuer using public keys. The public keys can be uploaded to the
              system or retrieved automatically from a JWKS endpoint.
            </DialogContentText>
            <PublicKeyAcquisitionSelector />
          </DialogContent>
        )}
        {activeStep === 1 && issuer.status !== "error" && (
          <DialogContent>
            {issuer.modified.publicKeyAcquisition === "pki" && (
              <React.Fragment>
                <DialogContentText>
                  Specify the public key information. You can add more keys
                  after the issuer is created.
                </DialogContentText>

                <PublicKeyDetails
                  publicKey={addPublicKey}
                  onPublicKeyChanged={(publicKey: any) =>
                    setAddPublicKey(publicKey)
                  }
                  existingPublicKeys={[]}
                />
              </React.Fragment>
            )}
            {issuer.modified.publicKeyAcquisition === "jwks" && (
              <React.Fragment>
                <DialogContentText className={classes.description}>
                  Specify the JWKS endpoint URL
                </DialogContentText>
                <JwksUrlInput />
              </React.Fragment>
            )}
          </DialogContent>
        )}
        {issuer.status === "error" && (
          <DialogContent>
            <PortalError error={issuer.error} />
          </DialogContent>
        )}
        <DialogActions className={classes.inputField}>
          <Button
            onClick={() => onClose && onClose(false)}
            disabled={issuer.status === "updating"}
          >
            Cancel
          </Button>

          <Button
            onClick={() => setActiveStep(activeStep - 1)}
            disabled={activeStep === 0 || issuer.status !== "ready"}
          >
            Back
          </Button>
          {activeStep < 1 && (
            <Button
              onClick={handleNextStep}
              color="primary"
              variant="contained"
              disabled={issuer.status !== "ready" || hasStep1Error()}
            >
              Next
            </Button>
          )}
          {activeStep === 1 && (
            <Button
              color="primary"
              variant="contained"
              disabled={hasError() || issuer.status !== "ready"}
              onClick={handleSave}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  }
  return null;
}

function NewIssuer({ ...rest }: any) {
  return (
    <IssuerProvider issuerId={NewIssuerId}>
      <NewIssuerImpl {...rest} />
    </IssuerProvider>
  );
}

export default NewIssuer;
