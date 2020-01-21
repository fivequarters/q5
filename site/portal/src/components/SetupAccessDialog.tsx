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
import FunctionResourceSelector from "./FunctionResourceSelector";
import React from "react";
import AddCliIdentityFlow from "./AddCliIdentityFlow";
import AddOauthImplicitIdentityFlow from "./AddOauthImplicitIdentityFlow";
import { useProfile } from "./ProfileProvider";
import { getUser, getClient } from "../lib/Fusebit";
import { FusebitError } from "./ErrorBoundary";
import PortalError from "./PortalError";
import LinearProgress from "@material-ui/core/LinearProgress";
import WarningCard from "./WarningCard";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    // minHeight: window.location.hash.indexOf("flexible") > -1 ? 0 : 480
  }
}));

function SetupAccessDialog({ onClose, agentId, isUser, data, onNewData }: any) {
  const classes = useStyles();
  const { profile } = useProfile();
  const oauthDeviceFlowEnabled = !!(
    profile.oauth.deviceAuthorizationUrl &&
    profile.oauth.deviceClientId &&
    profile.oauth.tokenUrl
  );
  const [resource, setResource] = React.useState<any>({
    parts: {
      subscriptionId: "*",
      boundaryId: "",
      functionId: ""
    }
  });
  const [activeStep, setActiveStep] = React.useState(0);
  const [flow, setFlow] = React.useState("oauth-implicit");
  const [agent, setAgent] = React.useState<any>(undefined);

  const computeCliDefaults = (agent: any) => {
    // Pick the resource with `function:` action that has the least number of segments
    agent.mostGenericFunctionResource = (
      (agent.access && agent.access.allow) ||
      []
    ).reduce(
      (current: string, value: any) =>
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
    ] = (agent.mostGenericFunctionResource || "").split("/") as string[];
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
  };

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (agent === undefined) {
      (async () => {
        let data: any;
        try {
          data = isUser
            ? await getUser(profile, agentId)
            : await getClient(profile, agentId);
        } catch (e) {
          data = {
            error: new FusebitError(
              `Error loading ${isUser ? "user" : "client"}`,
              {
                details:
                  (e.status || e.statusCode) === 403
                    ? `You are not authorized to access the ${
                        isUser ? "user" : "client"
                      } information.`
                    : e.message || "Unknown error."
              }
            )
          };
        }
        if (!cancelled) {
          computeCliDefaults(data);
          setAgent(data);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [agent, profile, agentId, isUser]);

  const handleSubmit = () => onClose && onClose();

  const handleFlowChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFlow(event.target.value as string);
  };

  const handleNextStep = () => setActiveStep(activeStep + 1);

  const handlePreviousStep = () => setActiveStep(activeStep - 1);

  const formatAgent = () => {
    if (!agent) return agentId;
    let name = [];
    if (agent.firstName) name.push(agent.firstName);
    if (agent.lastName) name.push(agent.lastName);
    if (agent.displayName) name.push(agent.displayName);
    return name.length > 0 ? name.join(" ") : agentId;
  };

  const formatAccess = (flow: string) => {
    switch (flow) {
      case "oauth-implicit":
        return "Fusebit Portal";
      case "oauth-device":
        return "Fusebit CLI using OAuth";
      default:
        return "Fusebit CLI using a public/private key pair";
    }
  };

  const formatAccount = () => profile.displayName || profile.account;

  const formatUsage = () => {
    switch (flow) {
      case "oauth-implicit":
        return "Portal";
      case "oauth-device":
        return "CLI";
      default:
        return "CLI";
    }
  };

  function flowSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Select the Fusebit Platform tool you would like{" "}
          <strong>{formatAgent()}</strong> to access:
        </DialogContentText>
        <Select
          id="flowChoice"
          value={flow}
          onChange={handleFlowChange}
          fullWidth
          variant="filled"
          autoFocus
        >
          <MenuItem value="oauth-implicit">
            {formatAccess("oauth-implicit")}
          </MenuItem>
          <MenuItem value="pki">{formatAccess("pki")}</MenuItem>
          {oauthDeviceFlowEnabled && (
            <MenuItem value="oauth-device">
              {formatAccess("oauth-device")}
            </MenuItem>
          )}
        </Select>
      </DialogContent>
    );
  }

  const noPermissions =
    agent &&
    (!agent.access || !agent.access.allow || agent.access.allow.length === 0);

  function resourceDefaults() {
    return (
      <DialogContent>
        <DialogContentText>
          You have chosen to enable <strong>{formatAgent()}</strong> to access
          the <strong>{formatAccess(flow)}.</strong>
        </DialogContentText>
        {noPermissions && (
          <React.Fragment>
            <WarningCard>
              {isUser ? "User" : "Client"} <strong>{formatAgent()}</strong> does
              not have access to any resources in the{" "}
              <strong>{formatAccount()}</strong> account. This may result in
              errors when using the {formatUsage()}. You can proceed with this
              setup, but consider using the <strong>Access</strong> tab to grant
              permissions to the {isUser ? "user" : "client"} when you are done.
            </WarningCard>
            {formatUsage() === "CLI" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify default parameters for the CLI commands, which
                eliminates the need for the {isUser ? "user" : "client"} to
                specify them with every command. These can be set or reset later
                using the CLI itself. To proceed without defaults, leave them
                blank.
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
                eliminates the need for the {isUser ? "user" : "client"} to
                specify them with every command. Below is a recommended set of
                defaults based on the resources <strong>{formatAgent()}</strong>{" "}
                has access to. These can be set or reset later using the CLI
                itself. To proceed without defaults, leave them blank.
              </DialogContentText>
            )}
            {formatUsage() === "Portal" && (
              <DialogContentText>
                During initialization, you can <strong>optionally</strong>{" "}
                specify the default Portal location for the user. This can be
                set or reset later through the Portal itself. Below is a
                recommended set of defaults based on the resources{" "}
                <strong>{formatAgent()}</strong> has access to. To proceed
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
          generated for this {isUser ? "user" : "client"}.
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
        Invite {isUser ? "user" : "client"} to Fusebit
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
      {activeStep === 0 && !agent && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      {activeStep === 0 && agent && agent.error && (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      )}
      {activeStep === 0 && agent && !agent.error && flowSelector()}
      {activeStep === 1 && resourceDefaults()}
      {activeStep === 2 && flow === "pki" && (
        <AddCliIdentityFlow
          options={resource.parts}
          agentId={agentId}
          isUser={isUser}
          flow="pki"
        />
      )}
      {activeStep === 2 && flow === "oauth-implicit" && (
        <AddOauthImplicitIdentityFlow
          options={resource.parts}
          agentId={agentId}
        />
      )}
      {activeStep === 2 && flow === "oauth-device" && (
        <AddCliIdentityFlow
          options={resource.parts}
          agentId={agentId}
          isUser={isUser}
          flow="oauth-device"
        />
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
            disabled={resource.hasError || !agent || agent.error}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && (
          <Button
            onClick={handleSubmit}
            color="primary"
            disabled={resource.hasError}
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
