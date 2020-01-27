import { DialogContentText } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
// import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import GridOnIcon from "@material-ui/icons/GridOn";
import React from "react";
import { actionsHash, roles, rolesHash } from "../lib/Actions";
import { IFusebitProfile } from "../lib/Settings";
import { modifyAgent, saveAgent, useAgent, formatAgent } from "./AgentProvider";
import FunctionResourceCrumb from "./FunctionResourceCrumb";
import FunctionResourceSelector from "./FunctionResourceSelector";
import PortalError from "./PortalError";
import { useProfile } from "./ProfileProvider";

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    // minHeight: window.location.hash.indexOf("flexible") > -1 ? 0 : 480
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

const makeResource = (
  profile: IFusebitProfile,
  action: string,
  options: any
) => {
  let resource = [`/account/${profile.account}/`];
  if (action.indexOf("function:") === 0) {
    if (
      options.subscriptionId.trim() &&
      options.subscriptionId.trim() !== "*"
    ) {
      resource.push(`subscription/${options.subscriptionId.trim()}/`);
      if (options.boundaryId.trim()) {
        resource.push(`boundary/${options.boundaryId.trim()}/`);
        if (options.functionId.trim()) {
          resource.push(`function/${options.functionId.trim()}/`);
        }
      }
    }
  }
  return resource.join("");
};

const createPermissionId = (permission: any) =>
  `${permission.action}#${permission.resource}`;

function AddPermissionSetDialog({ onClose, data, onNewData }: any) {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();
  const { profile } = useProfile();
  const [role, setRole] = React.useState<any>(roles[0]);
  const [resource, setResource] = React.useState<any>({
    parts: {
      subscriptionId: "*",
      boundaryId: "",
      functionId: ""
    }
  });
  const [activeStep, setActiveStep] = React.useState(0);

  const handleSubmit = () => {
    if (agent.status === "ready") {
      let allowHash: any = {};
      let allow: any[] = [];
      ((agent.modified.access && agent.modified.access.allow) || []).forEach(
        (e: any) => {
          allow.push(e);
          allowHash[createPermissionId(e)] = true;
        }
      );
      rolesHash[role.role].actions.forEach((a: string) => {
        const permission = {
          action: a,
          resource: makeResource(profile, a, resource.parts)
        };
        if (!allowHash[createPermissionId(permission)]) {
          allow.push(permission);
        }
      });
      agent.modified.access = { allow };
      modifyAgent(agent, setAgent, { ...agent.modified });
      saveAgent(agent, setAgent, undefined, e => !e && onClose && onClose());
    }
  };

  const handleNextStep = () => {
    let nextStep = activeStep + 1;
    setActiveStep(nextStep);
  };

  const handlePreviousStep = () => {
    let nextStep = activeStep - 1;
    if (nextStep === 0) {
      setResource({
        parts: {
          subscriptionId: "*",
          boundaryId: "",
          functionId: ""
        }
      });
    }
    setActiveStep(nextStep);
  };

  const handleRoleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    let roleName = event.target.value as string;
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].role === roleName) {
        setRole(roles[i]);
        break;
      }
    }
  };

  function roleSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Select the permission set for {agent.isUser ? "user" : "client"}{" "}
          <strong>{formatAgent(agent)}</strong>. You can only assign a
          permission set if you have all necessary permissions yourself. On the
          next screen you will be able to select the resource scope for this
          permission set.
        </DialogContentText>
        <Select
          id="roleChoice"
          value={role.role}
          fullWidth
          variant="filled"
          onChange={handleRoleChange}
          className={classes.inputField}
          autoFocus
        >
          {roles.map((a: any) => (
            <MenuItem key={a.role} value={a.role}>
              <strong>{a.title}</strong> - {a.description}
            </MenuItem>
          ))}
        </Select>
      </DialogContent>
    );
  }

  const isAccountLevelPermissionSet = () => role.role === "admin";

  function resourceSelector() {
    if (isAccountLevelPermissionSet()) {
      return (
        <DialogContent>
          <DialogContentText>
            Apply the{" "}
            <strong>
              {role.title} - {role.description}
            </strong>{" "}
            permission set at the account level:
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
              {role.title} - {role.description}
            </strong>{" "}
            permission set to:
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

  function permissionReview() {
    if (agent.status === "error") {
      return (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      );
    } else if (agent.status === "ready" || agent.status === "updating") {
      const permissions = rolesHash[role.role].actions.map((a: string) => ({
        action: (
          <React.Fragment>
            <strong>{actionsHash[a].action}</strong> -{" "}
            {actionsHash[a].description}
          </React.Fragment>
        ),
        resource:
          a.indexOf("function:") === 0 ? (
            <FunctionResourceCrumb data={data} options={resource.parts} />
          ) : (
            <FunctionResourceCrumb data={data} options={{}} />
          )
      }));

      return (
        <DialogContent>
          <DialogContentText>
            The following permissions will be granted to{" "}
            {agent.isUser ? "user" : "client"}{" "}
            <strong>{formatAgent(agent)}</strong>:
          </DialogContentText>
          {/* <DialogContentText> */}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>Resource</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.resource}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* </DialogContentText> */}
        </DialogContent>
      );
    }
  }

  return (
    <Dialog
      open={true}
      onClose={() => onClose && onClose(undefined)}
      aria-labelledby="form-dialog-title"
      maxWidth="md"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title">Grant permission set</DialogTitle>
      <Stepper activeStep={activeStep}>
        <Step>
          <StepLabel>Select permission set</StepLabel>
        </Step>
        <Step>
          <StepLabel>Select resource</StepLabel>
        </Step>
        <Step>
          <StepLabel>Confirm</StepLabel>
        </Step>
      </Stepper>
      {activeStep === 0 && agent.status === "loading" && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      {agent.status === "error" && (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      )}
      {activeStep === 0 && agent.status === "ready" && roleSelector()}
      {activeStep === 1 && agent.status === "ready" && resourceSelector()}
      {activeStep === 2 && agent.status !== "error" && permissionReview()}
      <DialogActions>
        <Button
          onClick={() => onClose && onClose()}
          disabled={agent.status === "updating"}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePreviousStep}
          disabled={activeStep === 0 || agent.status !== "ready"}
        >
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
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AddPermissionSetDialog;
