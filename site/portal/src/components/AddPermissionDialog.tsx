import { DialogContentText } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import PermissionActionSelector from "./PermissionActionSelector";
import SubscriptionSelector from "./SubscriptionSelector";
import BoundarySelector from "./BoundarySelector";
import FunctionSelector from "./FunctionSelector";
import { useProfile } from "./ProfileProvider";
import GridOnIcon from "@material-ui/icons/GridOn";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    minHeight: window.location.hash.indexOf("flexible") > -1 ? 0 : 480
  },
  breadcrumbEntry: {
    display: "flex"
  },
  breadcrumbIcon: {
    marginRight: theme.spacing(1)
  },
  inputField: {
    marginTop: theme.spacing(2)
  }
}));

function AddPermissionDialog({ onClose, data, onNewData }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const [action, setAction] = React.useState<any>({});
  const initialResource = {
    subscriptionId: "",
    boundaryId: "",
    functionId: ""
  };
  const [resource, setResource] = React.useState<any>(initialResource);
  const [activeStep, setActiveStep] = React.useState(0);
  const subscriptionSelected =
    resource.subscriptionId && resource.subscriptionId !== "*";

  const handleSubscriptionIdChange = (subscriptionId: string) => {
    resource.subscriptionId = subscriptionId;
    const trimmed = resource.subscriptionId.trim();
    if (
      trimmed.length > 0 &&
      trimmed !== "*" &&
      (trimmed.indexOf("sub-") !== 0 || trimmed.length !== 20)
    ) {
      resource.subscriptionIdError =
        "Subscription ID must have 20 characters and start with 'sub-'.";
    } else {
      delete resource.subscriptionIdError;
    }
    if (trimmed === "*") {
      resource.boundaryId = initialResource.boundaryId;
      resource.functionId = initialResource.functionId;
    }
    setResource({ ...resource });
  };

  const handleBoundaryIdChange = (value: string) => {
    resource.boundaryId = value;
    const trimmed = resource.boundaryId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,63}$/)) {
      resource.boundaryIdError =
        "Boundary ID must must have between 1 and 63 lowercase letters, digits, and dashes.";
    } else {
      delete resource.boundaryIdError;
    }
    setResource({ ...resource });
  };

  const handleFunctionIdChange = (value: string) => {
    resource.functionId = value;
    const trimmed = resource.functionId.trim();
    if (trimmed.length > 0 && !trimmed.match(/^[a-z0-9-]{1,64}$/)) {
      resource.functionIdError =
        "Function ID must must have between 1 and 64 lowercase letters, digits, and dashes.";
    } else {
      delete resource.functionIdError;
    }
    setResource({ ...resource });
  };

  const hasError = () =>
    !!(
      resource.subscriptionIdError ||
      resource.boundaryIdError ||
      resource.functionIdError
    );

  const serializeResource = () => {
    let result = [`/account/${profile.account}/`];
    if (resource.subscriptionId && resource.subscriptionId !== "*") {
      result.push(`subscription/${resource.subscriptionId}/`);
      if (resource.boundaryId.trim()) {
        result.push(`boundary/${resource.boundaryId.trim()}/`);
        if (resource.functionId.trim()) {
          result.push(`function/${resource.functionId.trim()}/`);
        }
      }
    }
    return result.join("");
  };

  const handleSubmit = () => {
    onClose &&
      onClose({
        action: action.action,
        resource: serializeResource()
      });
  };

  const handleActionChange = (action: string, description: string) => {
    setAction({ action, description });
  };

  const handleNextStep = () => {
    let nextStep = activeStep + 1;
    setActiveStep(nextStep);
  };

  const handlePreviousStep = () => {
    let nextStep = activeStep - 1;
    if ((nextStep = 0)) {
      setResource({ ...initialResource });
    }
    setActiveStep(nextStep);
  };

  function actionSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Select the action you would like to allow the user to perform. You can
          only select from the set of actions you are allowed to perform
          yourself. In the next step you will be able to select the resource
          scope for this action.
        </DialogContentText>
        <PermissionActionSelector
          action={action.action}
          onChange={handleActionChange}
          fullWidth
          variant="filled"
          autoFocus
          className={classes.inputField}
        />
      </DialogContent>
    );
  }

  const isAccountLevelPermission = () =>
    action.action.indexOf("function:") === -1;

  function resourceSelector() {
    if (isAccountLevelPermission()) {
      return (
        <DialogContent>
          <DialogContentText>
            Apply the{" "}
            <strong>
              {action.action} - {action.description}
            </strong>{" "}
            action at the account level:
          </DialogContentText>
          <DialogContentText className={classes.breadcrumbEntry}>
            <GridOnIcon className={classes.breadcrumbIcon} />
            {profile.displayName || profile.account}
            {profile.displayName && ` (${profile.account})`}
          </DialogContentText>
        </DialogContent>
      );
    } else {
      return (
        <DialogContent>
          <DialogContentText>
            Apply the{" "}
            <strong>
              {action.action} - {action.description}
            </strong>{" "}
            action to this resource:
          </DialogContentText>
          <SubscriptionSelector
            data={data}
            onNewData={onNewData}
            enableAnySubscription={true}
            subscriptionId={resource.subscriptionId}
            onChange={handleSubscriptionIdChange}
            fullWidth
            variant="filled"
            autoFocus
            className={classes.inputField}
          />
          <BoundarySelector
            data={data}
            onNewData={onNewData}
            subscriptionId={
              subscriptionSelected ? resource.subscriptionId : undefined
            }
            boundaryId={resource.boundaryId}
            disabled={!subscriptionSelected}
            fullWidth
            variant="filled"
            onChange={handleBoundaryIdChange}
            error={!!resource.boundaryIdError}
            helperText={resource.boundaryIdError}
            className={classes.inputField}
          />
          <FunctionSelector
            data={data}
            onNewData={onNewData}
            subscriptionId={
              subscriptionSelected && !resource.boundaryIdError
                ? resource.subscriptionId
                : undefined
            }
            boundaryId={
              resource.boundaryIdError ? undefined : resource.boundaryId
            }
            functionId={resource.functionId}
            disabled={
              !!!(
                subscriptionSelected &&
                resource.boundaryId &&
                !resource.boundaryIdError
              )
            }
            fullWidth
            variant="filled"
            onChange={handleFunctionIdChange}
            error={!!resource.functionIdError}
            helperText={resource.functionIdError}
            className={classes.inputField}
          />
        </DialogContent>
      );
    }
  }

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(undefined)}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title">Add Permission</DialogTitle>
      <Stepper activeStep={activeStep}>
        <Step>
          <StepLabel>Select action</StepLabel>
        </Step>
        <Step>
          <StepLabel>Select resource</StepLabel>
        </Step>
      </Stepper>
      {activeStep === 0 && actionSelector()}
      {activeStep === 1 && resourceSelector()}
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        <Button onClick={handlePreviousStep} disabled={activeStep === 0}>
          Back
        </Button>
        {activeStep === 0 && (
          <Button onClick={handleNextStep} color="primary" variant="contained">
            Next
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            onClick={handleSubmit}
            color="primary"
            disabled={hasError()}
            variant="contained"
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddPermissionDialog;
