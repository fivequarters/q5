import { LinearProgress } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Grid from "@material-ui/core/Grid";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import React from "react";
import { createPermissionsFromRole, noRole, rolesHash } from "../lib/Actions";
import { Permission, User } from "../lib/FusebitTypes";
import AddCliIdentityFlow from "./AddCliIdentityFlow";
import AddOauthImplicitIdentityFlow from "./AddOauthImplicitIdentityFlow";
import {
  AgentProvider,
  formatAgent,
  modifyAgent,
  saveAgent,
  useAgent
} from "./AgentProvider";
import ConfirmNavigation from "./ConfirmNavigation";
import { FusebitError } from "./ErrorBoundary";
import FunctionResourceCrumb from "./FunctionResourceCrumb";
import FunctionResourceSelector from "./FunctionResourceSelector";
import FusebitToolSelector from "./FusebitToolSelector";
import InfoCard from "./InfoCard";
import PermissionReviewTable from "./PermissionReviewTable";
import PermissionRoleSelector from "./PermissionRoleSelector";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";
import UserDetails from "./UserDetails";
import WarningCard from "./WarningCard";
import ClientDetails from "./ClientDetails";

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
  }
}));

const createInitialResurce = () => ({
  parts: {
    subscriptionId: "*",
    boundaryId: "",
    functionId: ""
  }
});

function NewAgentImpl() {
  const classes = useStyles();
  const { profile } = useProfile();
  const [activeStep, setActiveStep] = React.useState(0);
  const [agent, setAgent] = useAgent();
  const [role, setRole] = React.useState<any>(noRole);
  const [resource, setResource] = React.useState<any>(createInitialResurce());
  const [defaultResource, setDefaultResource] = React.useState<any>(
    createInitialResurce()
  );
  const [flow, setFlow] = React.useState("none");
  const [initGenerated, setInitGenerated] = React.useState(false);

  const agentNoun = agent.isUser ? "user" : "client";

  const handleRoleChange = (role: any) => {
    setRole(role);
    if (role.role !== "developer") {
      setResource(createInitialResurce());
      setDefaultResource(createInitialResurce());
    }
  };

  const hasError = () =>
    !!(
      (resource.hasError && role.role !== noRole.role) ||
      (defaultResource.hasError && flow !== "none")
    );

  const handleResourceChange = (resource: any) => {
    setResource(resource);
    setDefaultResource({ ...resource });
  };

  const handleNextStep = () => {
    if (activeStep === 3 && agent.status === "ready") {
      let allow: Permission[] = [];
      if (role.role !== noRole.role) {
        createPermissionsFromRole(profile, role, resource.parts).forEach(
          permission => {
            allow.push(permission);
          }
        );
      }
      agent.modified.access = { allow };
      modifyAgent(agent, setAgent, { ...agent.modified });
      saveAgent(
        agent,
        setAgent,
        e =>
          new FusebitError(`Error creating ${agentNoun}`, {
            details:
              (e.status || e.statusCode) === 403
                ? `You are not authorized to create ${agentNoun}s.`
                : e.message || "Unknown error.",
            source: "CreateNewUser"
          })
      );
    }
    setActiveStep(activeStep + 1);
  };

  const done = () => {
    let agentName = formatAgent(agent);
    if (agent.status === "updating") {
      return (
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <LinearProgress />
          </Grid>
        </Grid>
      );
    } else if (agent.status === "ready") {
      return (
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <DialogContent>
              <DialogContentText>
                {agent.isUser ? "User" : "Client"}{" "}
                {agentName && <strong>{agentName}</strong>} created.
              </DialogContentText>
            </DialogContent>
            {(flow === "pki" || flow === "oauth-device") && (
              <AddCliIdentityFlow
                options={defaultResource.parts}
                flow={flow}
                onDone={() => setInitGenerated(true)}
              />
            )}
            {flow === "oauth-implicit" && (
              <AddOauthImplicitIdentityFlow
                options={defaultResource.parts}
                onDone={() => setInitGenerated(true)}
              />
            )}
          </Grid>
        </Grid>
      );
    } else if (agent.status === "error") {
      return (
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <PortalError error={agent.error} />
          </Grid>
        </Grid>
      );
    }

    return null;
  };

  const confirmation = () => {
    let agentName = formatAgent(agent);
    if (agent.status === "ready") {
      let email = (agent.modified as User).primaryEmail;
      return (
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            {agentName && (
              <DialogContentText>
                You are about to create {agentNoun} <strong>{agentName}</strong>
                {email && (
                  <span>
                    {" "}
                    with email <strong>{email}</strong>
                  </span>
                )}
                .
              </DialogContentText>
            )}
            {!agentName && (
              <DialogContentText>
                You are about to create a new {agentNoun}.
              </DialogContentText>
            )}
            {role.role === noRole.role && (
              <WarningCard>
                You did not grant {!agentName && "the "}
                {agentNoun} {agentName && <strong>{agentName} </strong>}
                permissions to any resources. This may result in errors for the{" "}
                {agentNoun} when accessing{" "}
                {agent.isUser ? "the Portal or CLI" : "the system"}. You can
                proceed with this setup, but consider using the{" "}
                <strong>Access</strong> tab to grant permissions for the{" "}
                {agentNoun}
                when you are done.
              </WarningCard>
            )}
            {flow === "none" && (
              <WarningCard>
                You did not invite {!agentName && "the "}
                {agentNoun} {agentName && <strong>{agentName} </strong>}to any
                of the Fusebit Platform tools. They will not be able to access
                the system. You can continue with this setup, but consider using
                the{" "}
                <strong>
                  {agent.isUser
                    ? "Invite User to the Platform"
                    : "Connect CLI client to Fusebit"}
                </strong>{" "}
                quick action after you are done.
              </WarningCard>
            )}
            {role.role !== noRole.role && (
              <React.Fragment>
                <DialogContentText>
                  The following permissions will be granted for the {agentNoun}{" "}
                  as part of the <strong>{role.title}</strong> permission set:
                </DialogContentText>
                <PermissionReviewTable
                  actions={rolesHash[role.role].actions}
                  resource={resource}
                />
                <DialogContentText>&nbsp;</DialogContentText>
              </React.Fragment>
            )}
            <DialogContentText>
              Select <strong>Next</strong> to create the {agentNoun}.
            </DialogContentText>
          </Grid>
        </Grid>
      );
    }
    return null;
  };

  const inviteSelector = () => {
    let agentName = formatAgent(agent);
    return (
      <React.Fragment>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            {/* <DialogContent> */}
            <DialogContentText>
              {agentName ? (
                <span>
                  Select the Fusebit Platform tool you would like{" "}
                  <strong>{agentName}</strong> to access:
                </span>
              ) : (
                <span>
                  Select the Fusebit Platform tool you would like the new{" "}
                  {agentNoun}
                  to access:
                </span>
              )}{" "}
            </DialogContentText>
            <FusebitToolSelector
              flow={flow}
              onFlowChange={(flow: string) => setFlow(flow)}
              allowNoTool
              isUser={agent.isUser}
              autoFocus
              disabled={agent.status !== "ready"}
            />
            {flow !== "none" && (
              <DialogContentText>
                <br></br>
                You can <strong>optionally</strong> specify defaults for the
                tool, which will determine the default view and parameters for
                the {agentNoun}. Here is a recommended set of defaults based on
                the resources {agentName || `the ${agentNoun}`} has access to.
                To proceed without defaults, keep these blank.
              </DialogContentText>
            )}
            {/* </DialogContent> */}
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            {flow !== "none" && (
              <FunctionResourceSelector
                resource={defaultResource}
                onResourceChange={(resource: any) =>
                  setDefaultResource(resource)
                }
                disabled={agent.status !== "ready"}
              />
            )}
            <DialogContentText>
              <br></br>
              You will be able to invite the {agentNoun} to additional tools
              after you are done.
            </DialogContentText>
          </Grid>
          <Grid item xs={4}>
            {activeStep === 2 && flow === "oauth-implicit" && (
              <InfoCard>
                <DialogContentText>
                  The Fusebit Portal uses these values to provide a default view
                  when the {agentNoun} logs in.
                </DialogContentText>
              </InfoCard>
            )}
            {activeStep === 2 && (flow === "oauth-device" || flow === "pki") && (
              <InfoCard>
                <DialogContentText>
                  The Fusebit CLI uses these values as default parameters for
                  commands, to make it faster to manage the specified resource.
                </DialogContentText>
              </InfoCard>
            )}
          </Grid>
        </Grid>
      </React.Fragment>
    );
  };

  const permissionSelector = () => {
    let agentName = formatAgent(agent);
    return (
      <React.Fragment>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            {/* <DialogContent> */}
            <DialogContentText>
              {agentName ? (
                <span>
                  Select the permission set for {agentNoun}{" "}
                  <strong>{agentName}</strong>.
                </span>
              ) : (
                <span>Select the permission set for the new {agentNoun}.</span>
              )}{" "}
              You can only assign a permission set if you have all the necessary
              permissions yourself.
            </DialogContentText>
            <PermissionRoleSelector
              role={role}
              onRoleChange={handleRoleChange}
              autoFocus
              allowNoRole
              disabled={agent.status !== "ready"}
            />
            {role.role !== noRole.role && (
              <DialogContentText>
                <br></br>
                Apply the permission set to:
              </DialogContentText>
            )}
            {/* </DialogContent> */}
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            {/* <DialogContent> */}
            {role.role === "admin" && (
              <DialogContentText>
                <FunctionResourceCrumb
                  options={{ accountId: profile.account }}
                />
              </DialogContentText>
            )}
            {role.role === "developer" && (
              <FunctionResourceSelector
                resource={resource}
                onResourceChange={handleResourceChange}
                disabled={agent.status !== "ready"}
              />
            )}
            {/* </DialogContent> */}
          </Grid>
          <Grid item xs={4}>
            {activeStep === 1 && role.role === "developer" && (
              <InfoCard>
                <DialogContentText>
                  Leaving the subscription, boundary, and function blank will
                  grant the {agentNoun} developer permissions for the whole
                  account.
                </DialogContentText>
                <DialogContentText>
                  Specifying subscription, boundary, or function constraints
                  limits the effective scope of the permission set.
                </DialogContentText>
              </InfoCard>
            )}
          </Grid>
        </Grid>
      </React.Fragment>
    );
  };

  if (
    agent.status === "ready" ||
    agent.status === "updating" ||
    agent.status === "error"
  ) {
    return (
      <React.Fragment>
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <Stepper
              activeStep={activeStep}
              color="inherit"
              className={classes.stepper}
            >
              <Step>
                <StepLabel>Set properties</StepLabel>
              </Step>
              <Step>
                <StepLabel>Grant permissions</StepLabel>
              </Step>
              <Step>
                <StepLabel>Invite to Fusebit</StepLabel>
              </Step>
              <Step>
                <StepLabel>Confirm</StepLabel>
              </Step>
              <Step>
                <StepLabel>Done</StepLabel>
              </Step>
            </Stepper>
          </Grid>
        </Grid>
        {activeStep === 0 && agent.status !== "error" && (
          <Grid container spacing={2} className={classes.gridContainer}>
            <Grid item xs={8} className={classes.form}>
              {agent.isUser && <UserDetails />}
              {!agent.isUser && <ClientDetails />}
            </Grid>
          </Grid>
        )}
        {activeStep === 1 && agent.status !== "error" && permissionSelector()}
        {activeStep === 2 && agent.status !== "error" && inviteSelector()}
        {activeStep === 3 && agent.status !== "error" && confirmation()}
        {activeStep === 4 && agent.status !== "error" && done()}
        {agent.status === "error" && (
          <Grid container spacing={2} className={classes.gridContainer}>
            <Grid item xs={8} className={classes.form}>
              <PortalError error={agent.error} />
            </Grid>
          </Grid>
        )}
        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={8} className={classes.form}>
            <DialogActions className={classes.inputField}>
              <Button
                onClick={() => setActiveStep(activeStep - 1)}
                disabled={
                  hasError() ||
                  activeStep === 0 ||
                  activeStep === 4 ||
                  agent.status !== "ready"
                }
              >
                Back
              </Button>
              {activeStep < 4 && (
                <Button
                  onClick={handleNextStep}
                  color="primary"
                  variant="contained"
                  disabled={hasError() || agent.status !== "ready"}
                >
                  Next
                </Button>
              )}
              {activeStep === 4 && (
                <Button
                  color="primary"
                  variant="contained"
                  disabled={
                    hasError() ||
                    agent.status === "updating" ||
                    (!initGenerated &&
                      flow !== "none" &&
                      agent.status === "ready")
                  }
                  href={agent.isUser ? "../users" : "../clients"}
                >
                  Done
                </Button>
              )}
            </DialogActions>
          </Grid>
        </Grid>
        {(agent.status === "ready" || agent.status === "updating") &&
          (agent.dirty || activeStep > 0) &&
          activeStep !== 4 && <ConfirmNavigation />}
      </React.Fragment>
    );
  }
  return null;
}

function NewAgent({ isUser }: any) {
  return (
    <AgentProvider agentId={AgentProvider.NewAgentId} isUser={isUser}>
      <NewAgentImpl />
    </AgentProvider>
  );
}

export default NewAgent;
