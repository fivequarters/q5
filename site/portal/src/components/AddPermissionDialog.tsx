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
import FunctionResourceSelector from "./FunctionResourceSelector";
import PermissionActionSelector from "./PermissionActionSelector";
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
  const [resource, setResource] = React.useState<any>({
    parts: {
      subscriptionId: "*",
      boundaryId: "",
      functionId: ""
    }
  });
  const [activeStep, setActiveStep] = React.useState(0);

  const handleSubmit = () => {
    onClose &&
      onClose({
        action: action.action,
        resource: resource.serialized
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
      setResource({});
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
          <FunctionResourceSelector
            data={data}
            onNewData={onNewData}
            resource={resource}
            onResourceChange={(resource: any) => setResource(resource)}
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
            disabled={resource.hasError}
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
