import { DialogContentText } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React from "react";
import AddCliIdentityFlow from "./AddCliIdentityFlow";
import AddOauthImplicitIdentityFlow from "./AddOauthImplicitIdentityFlow";
import { useProfile } from "./ProfileProvider";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    minHeight: 480
  }
}));

function AddIdentityDialog({ onClose, agentId, isUser }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const initialAddIdentity = {
    issuerId: "",
    subject: ""
  };
  const initialCliConfiguration = {
    subscriptionId: profile.subscription || "",
    boundaryId: "",
    functonId: ""
  };
  const oauthDeviceFlowEnabled = !!(
    profile.oauth.deviceAuthorizationUrl &&
    profile.oauth.deviceClientId &&
    profile.oauth.tokenUrl
  );
  const [cliConfiguration, setCliConfiguration] = React.useState<any>({
    ...initialCliConfiguration
  });
  const [addIdentity, setAddIdentity] = React.useState<any>({
    ...initialAddIdentity
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

  const handleSubscriptionIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    cliConfiguration.subscriptionId = event.target.value;
    const trimmed = cliConfiguration.subscriptionId.trim();
    if (
      trimmed.length > 0 &&
      (trimmed.indexOf("sub-") !== 0 || trimmed.length !== 20)
    ) {
      cliConfiguration.subscriptionIdError =
        "Default subscription ID must have 20 characters and start with 'sub-'.";
    } else {
      delete cliConfiguration.subscriptionIdError;
    }
    setCliConfiguration({ ...cliConfiguration });
  };

  const handleBoundaryIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    cliConfiguration.boundaryId = event.target.value;
    const trimmed = cliConfiguration.boundaryId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,63}$/)) {
      cliConfiguration.boundaryIdError =
        "Default boundary ID must must have between 1 and 63 lowercase letters, digits, and dashes.";
    } else {
      delete cliConfiguration.boundaryIdError;
    }
    setCliConfiguration({ ...cliConfiguration });
  };

  const handleFunctionIdChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    cliConfiguration.functionId = event.target.value;
    const trimmed = cliConfiguration.functionId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,64}$/)) {
      cliConfiguration.functionIdError =
        "Default function ID must must have between 1 and 64 lowercase letters, digits, and dashes.";
    } else {
      delete cliConfiguration.functionIdError;
    }
    setCliConfiguration({ ...cliConfiguration });
  };

  const hasError = () =>
    !!(
      cliConfiguration.subscriptionIdError ||
      cliConfiguration.boundaryIdError ||
      cliConfiguration.functionIdError ||
      addIdentity.issuerIdError ||
      addIdentity.subjectError ||
      (flow === "manual" &&
        activeStep === 2 &&
        (!addIdentity.issuerId ||
          !addIdentity.issuerId.trim() ||
          !addIdentity.subject ||
          !addIdentity.subject.trim()))
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

  const hasConfiguration = () => {
    return flow === "oauth-device" || flow === "pki";
  };

  const handleNextStep = () => {
    let nextStep = activeStep + 1;
    if (nextStep === 1 && !hasConfiguration()) nextStep = 2;
    setActiveStep(nextStep);
  };

  const handlePreviousStep = () => {
    let nextStep = activeStep - 1;
    if (nextStep === 1 && !hasConfiguration()) nextStep = 0;
    if (nextStep < 2) {
      setAddIdentity({ ...initialAddIdentity });
    }
    if (nextStep < 1) {
      setCliConfiguration({ ...initialCliConfiguration });
    }
    setActiveStep(nextStep);
  };

  const normalizeCliConfiguration = () => ({
    subscriptionId:
      (cliConfiguration.subscriptionId &&
        cliConfiguration.subscriptionId.trim()) ||
      undefined,
    boundaryId:
      (cliConfiguration.boundaryId && cliConfiguration.boundaryId.trim()) ||
      undefined,
    functionId:
      (cliConfiguration.functionId && cliConfiguration.functionId.trim()) ||
      undefined
  });

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
          {isUser && (
            <MenuItem value="oauth-implicit">
              Enable access to the portal using the OAuth implicit flow
            </MenuItem>
          )}
          {isUser && oauthDeviceFlowEnabled && (
            <MenuItem value="oauth-device">
              Enable access to the CLI using the OAuth device flow
            </MenuItem>
          )}
          <MenuItem value="pki">
            Enable access to the CLI using a public/private key pair
          </MenuItem>
          <MenuItem value="manual">
            Manually specify issuer ID and subject (advanced)
          </MenuItem>
        </Select>
      </DialogContent>
    );
  }

  function cliProfileDefaults() {
    return (
      <DialogContent>
        <DialogContentText>
          Specify optional defaults for the CLI commands
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="subscriptionId"
          label="Subscription ID"
          variant="filled"
          helperText={
            cliConfiguration.subscriptionIdError || "Default subscription ID"
          }
          fullWidth
          error={!!cliConfiguration.subscriptionIdError}
          value={cliConfiguration.subscriptionId}
          onChange={handleSubscriptionIdChange}
        />
        <TextField
          margin="dense"
          id="boundaryId"
          label="Boundary"
          variant="filled"
          helperText={
            cliConfiguration.boundaryIdError || "Default boundary name"
          }
          error={!!cliConfiguration.boundaryIdError}
          value={cliConfiguration.boundaryId}
          onChange={handleBoundaryIdChange}
          fullWidth
        />
        <TextField
          margin="dense"
          id="functionId"
          label="Function"
          variant="filled"
          helperText={
            cliConfiguration.functionIdError || "Default function name"
          }
          error={!!cliConfiguration.functionIdError}
          value={cliConfiguration.functionId}
          onChange={handleFunctionIdChange}
          fullWidth
        />
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
          <StepLabel>Choose flow</StepLabel>
        </Step>
        <Step>
          <StepLabel>Configure</StepLabel>
        </Step>
        <Step>
          <StepLabel>Finalize</StepLabel>
        </Step>
      </Stepper>
      {activeStep === 0 && flowSelector()}
      {activeStep === 1 && cliProfileDefaults()}
      {activeStep === 2 && flow === "manual" && manualFlow()}
      {activeStep === 2 && flow === "pki" && (
        <AddCliIdentityFlow
          options={normalizeCliConfiguration()}
          agentId={agentId}
          isUser={isUser}
          flow="pki"
        />
      )}
      {activeStep === 2 && flow === "oauth-implicit" && (
        <AddOauthImplicitIdentityFlow agentId={agentId} />
      )}
      {activeStep === 2 && flow === "oauth-device" && (
        <AddCliIdentityFlow
          options={normalizeCliConfiguration()}
          agentId={agentId}
          isUser={isUser}
          flow="oauth-device"
        />
      )}
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        {activeStep > 0 && <Button onClick={handlePreviousStep}>Back</Button>}
        {activeStep < 2 && (
          <Button
            onClick={handleNextStep}
            color="primary"
            disabled={hasError()}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && flow === "manual" && (
          <Button onClick={handleSubmit} color="primary" disabled={hasError()}>
            Add
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddIdentityDialog;
