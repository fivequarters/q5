import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import React from "react";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import { DialogContentText } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    minHeight: 400
  }
}));

function AddIdentityDialog({ onClose, issuer }: any) {
  const classes = useStyles();
  const [addIdentity, setAddIdentity] = React.useState<any>({
    issuerId: "",
    subject: ""
  });
  const [activeStep, setActiveStep] = React.useState(0);
  const [flow, setFlow] = React.useState("manual");

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

  const handleFlowChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFlow(event.target.value as string);
  };

  function flowSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Choose an identity setup flow suitable for the intended use
        </DialogContentText>
        <Select
          id="flowChoice"
          value={flow}
          onChange={handleFlowChange}
          fullWidth
          variant="filled"
          autoFocus
        >
          <MenuItem value="portal-oauth">
            Enable access to the portal using OAuth implicit flow
          </MenuItem>
          <MenuItem value="cli-pki">
            Enable access to the CLI using public/private key pair
          </MenuItem>
          <MenuItem value="cli-oauth">
            Enable access to the CLI using OAuth device flow
          </MenuItem>
          <MenuItem value="manual">
            Manually specify issuer ID and subject (advanced)
          </MenuItem>
        </Select>
      </DialogContent>
    );
  }

  function manualFlow() {
    return (
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
    );
  }

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title">Add Identity</DialogTitle>
      <Stepper activeStep={activeStep}>
        <Step>
          <StepLabel>Choose setup flow</StepLabel>
        </Step>
        <Step>
          <StepLabel>Obtain issuer ID and subject</StepLabel>
        </Step>
      </Stepper>
      {activeStep === 0 && flowSelector()}
      {activeStep === 1 && flow === "manual" && manualFlow()}
      {activeStep === 1 && flow !== "manual" && (
        <DialogContent>
          <DialogContentText>[TODO: Not implemented yet]</DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        {activeStep === 0 && (
          <Button onClick={() => setActiveStep(1)} color="primary">
            Next
          </Button>
        )}
        {activeStep === 1 && (
          <Button onClick={() => setActiveStep(0)}>Back</Button>
        )}
        {activeStep === 1 && flow === "manual" && (
          <Button onClick={handleSubmit} color="primary" disabled={hasError()}>
            Add
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddIdentityDialog;
