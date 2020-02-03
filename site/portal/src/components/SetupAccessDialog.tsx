import { DialogContentText } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { flowsHash } from "../lib/Flows";
import { Permission } from "../lib/FusebitTypes";
import AddCliIdentityFlow from "./AddCliIdentityFlow";
import AddOauthImplicitIdentityFlow from "./AddOauthImplicitIdentityFlow";
import { formatAgent, useAgent } from "./AgentProvider";
import FunctionResourceSelector from "./FunctionResourceSelector";
import FusebitToolSelector from "./FusebitToolSelector";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import WarningCard from "./WarningCard";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    // minHeight: window.location.hash.indexOf("flexible") > -1 ? 0 : 480
  }
}));

function SetupAccessDialog({ onClose, data, onNewData }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const [agent] = useAgent();
  const [resource, setResource] = React.useState<any>({
    parts: {
      subscriptionId: "*",
      boundaryId: "",
      functionId: ""
    }
  });
  const [activeStep, setActiveStep] = React.useState(0);
  const [flow, setFlow] = React.useState("oauth-implicit");

  React.useEffect(() => {
    if (agent.status === "ready") {
      // Pick the resource with `function:` action that has the least number of segments
      const mostGenericFunctionResource = (
        (agent.modified.access && agent.modified.access.allow) ||
        []
      ).reduce<string | undefined>(
        (current: string | undefined, value: Permission) =>
          value.action.indexOf("function:") < 0
            ? current
            : !current ||
              current.split("/").length > value.resource.split("/").length
            ? value.resource
            : current,
        undefined
      );
      //@ts-ignore
      const [
        ,
        account,
        accountId,
        subscription,
        subscriptionId,
        boundary,
        boundaryId,
        functionName,
        functionId
      ] = (mostGenericFunctionResource || "").split("/") as string[];
      const resource = {
        subscriptionId: "*",
        boundaryId: "",
        functionId: ""
      };
      if (
        account === "account" &&
        accountId === profile.account &&
        subscription === "subscription" &&
        subscriptionId
      ) {
        resource.subscriptionId = subscriptionId;
        if (boundary === "boundary" && boundaryId) {
          resource.boundaryId = boundaryId;
          if (functionName === "function" && functionId) {
            resource.functionId = functionId;
          }
        }
      }
      setResource({ parts: resource });
    }
  }, [agent, profile.account]);

  const handleSubmit = () => onClose && onClose();

  const handleFlowChange = (newFlow: string) => {
    setFlow(newFlow);
  };

  const handleNextStep = () => setActiveStep(activeStep + 1);

  const handlePreviousStep = () => setActiveStep(activeStep - 1);

  const formatAccess = (flow: string) =>
    (flowsHash[flow] && flowsHash[flow].description) || "N/A";

  const formatAccount = () => profile.displayName || profile.account;

  const formatUsage = () => (flowsHash[flow] && flowsHash[flow].usage) || "N/A";

  function flowSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Select the Fusebit Platform tool you would like{" "}
          <strong>{formatAgent(agent)}</strong> to access:
        </DialogContentText>
        <FusebitToolSelector
          flow={flow}
          onFlowChange={handleFlowChange}
          autoFocus
        />
      </DialogContent>
    );
  }

  const noPermissions =
    agent.status === "ready" &&
    (!agent.modified.access ||
      !agent.modified.access.allow ||
      agent.modified.access.allow.length === 0);

  function resourceDefaults() {
    return (
      <DialogContent>
        <DialogContentText>
          You have chosen to enable <strong>{formatAgent(agent)}</strong> to
          access the <strong>{formatAccess(flow)}.</strong>
        </DialogContentText>
        {noPermissions && (
          <React.Fragment>
            <WarningCard>
              {agent.isUser ? "User" : "Client"}{" "}
              <strong>{formatAgent(agent)}</strong> does not have access to any
              resources in the <strong>{formatAccount()}</strong> account. This
              may result in errors when using the {formatUsage()}. You can
              proceed with this setup, but consider using the{" "}
              <strong>Access</strong> tab to grant permissions to the{" "}
              {agent.isUser ? "user" : "client"} when you are done.
            </WarningCard>
            {formatUsage() === "CLI" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify default parameters for the CLI commands, which
                eliminates the need for the {agent.isUser ? "user" : "client"}{" "}
                to specify them with every command. These can be set or reset
                later using the CLI itself. To proceed without defaults, leave
                them blank.
              </DialogContentText>
            )}
            {formatUsage() === "Portal" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify the default Portal location for the user. These can be
                set or reset later through the Portal itself. To proceed without
                defaults, leave them blank.
              </DialogContentText>
            )}
          </React.Fragment>
        )}
        {!noPermissions && (
          <React.Fragment>
            {formatUsage() === "CLI" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify default parameters for the CLI commands, which
                eliminates the need for the {agent.isUser ? "user" : "client"}{" "}
                to specify them with every command. Below is a recommended set
                of defaults based on the resources{" "}
                <strong>{formatAgent(agent)}</strong> has access to. These can
                be set or reset later using the CLI itself. To proceed without
                defaults, leave them blank.
              </DialogContentText>
            )}
            {formatUsage() === "Portal" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify the default Portal location for the user. This can be
                set or reset later through the Portal itself. Below is a
                recommended set of defaults based on the resources{" "}
                <strong>{formatAgent(agent)}</strong> has access to. To proceed
                without defaults, leave them blank.
              </DialogContentText>
            )}
          </React.Fragment>
        )}
        <FunctionResourceSelector
          data={data}
          onNewData={onNewData}
          resource={resource}
          onResourceChange={(resource: any) => setResource(resource)}
        />
        <DialogContentText>
          <br></br>
          Proceeding to the next step{" "}
          <strong>invalidates any previous invitations</strong> you may have
          generated for this {agent.isUser ? "user" : "client"}.
        </DialogContentText>
      </DialogContent>
    );
  }

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="md"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title">
        Invite {agent.isUser ? "user" : "client"} to Fusebit
      </DialogTitle>
      <Stepper activeStep={activeStep}>
        <Step>
          <StepLabel>Select platform tool</StepLabel>
        </Step>
        <Step>
          <StepLabel>Check access</StepLabel>
        </Step>
        <Step>
          <StepLabel>Generate invitation</StepLabel>
        </Step>
      </Stepper>
      {activeStep === 0 && agent.status === "loading" && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      {activeStep === 0 && agent.status === "error" && (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      )}
      {activeStep === 0 && agent.status === "ready" && flowSelector()}
      {activeStep === 1 && resourceDefaults()}
      {activeStep === 2 && flow === "pki" && (
        <AddCliIdentityFlow options={resource.parts} flow="pki" />
      )}
      {activeStep === 2 && flow === "oauth-implicit" && (
        <AddOauthImplicitIdentityFlow options={resource.parts} />
      )}
      {activeStep === 2 && flow === "oauth-device" && (
        <AddCliIdentityFlow options={resource.parts} flow="oauth-device" />
      )}
      <DialogActions>
        <Button onClick={() => onClose && onClose()}>Cancel</Button>
        <Button onClick={handlePreviousStep} disabled={activeStep === 0}>
          Back
        </Button>
        {activeStep < 2 && (
          <Button
            onClick={handleNextStep}
            color="primary"
            variant="contained"
            disabled={resource.hasError || agent.status !== "ready"}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && (
          <Button
            onClick={handleSubmit}
            color="primary"
            disabled={resource.hasError || agent.status !== "ready"}
            variant="contained"
          >
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default SetupAccessDialog;
