import { DialogContentText } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import LinearProgress from '@material-ui/core/LinearProgress';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Stepper from '@material-ui/core/Stepper';
import { makeStyles } from '@material-ui/core/styles';
import GridOnIcon from '@material-ui/icons/GridOn';
import React from 'react';
import { createPermissionsFromRole, roles, rolesHash, sameRole } from '../lib/Actions';
import { formatAgent, modifyAgent, saveAgent, useAgent } from './AgentProvider';
import FunctionResourceSelector from './FunctionResourceSelector';
import PermissionsReviewTable from './PermissionReviewTable';
import PermissionRoleSelector from './PermissionRoleSelector';
import PortalError from './PortalError';
import { useProfile } from './ProfileProvider';

const useStyles = makeStyles((theme: any) => ({
  dialogPaper: {
    // minHeight: window.location.hash.indexOf("flexible") > -1 ? 0 : 480
  },
  breadcrumbEntry: {
    display: 'flex',
  },
  breadcrumbIcon: {
    marginRight: theme.spacing(1),
  },
  inputField: {
    marginTop: theme.spacing(2),
  },
}));

const createPermissionId = (permission: any) => `${permission.action}#${permission.resource}`;

function AddPermissionSetDialog({ onClose }: any) {
  const classes = useStyles();
  const [agent, setAgent] = useAgent();
  const { profile } = useProfile();
  const [role, setRole] = React.useState<any>(roles[0]);
  const [resource, setResource] = React.useState<any>({
    parts: {
      subscriptionId: '*',
      boundaryId: '',
      functionId: '',
    },
  });
  const [activeStep, setActiveStep] = React.useState(0);

  const handleSubmit = () => {
    if (agent.status === 'ready') {
      let allowHash: any = {};
      let allow: any[] = [];
      ((agent.modified.access && agent.modified.access.allow) || []).forEach((e: any) => {
        allow.push(e);
        allowHash[createPermissionId(e)] = true;
      });
      createPermissionsFromRole(profile, role, resource.parts).forEach((permission) => {
        if (!allowHash[createPermissionId(permission)]) {
          allow.push(permission);
        }
      });
      agent.modified.access = { allow };
      modifyAgent(agent, setAgent, { ...agent.modified });
      saveAgent(agent, setAgent, undefined, (e) => !e && onClose && onClose());
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
          subscriptionId: '*',
          boundaryId: '',
          functionId: '',
        },
      });
    }
    setActiveStep(nextStep);
  };

  function roleSelector() {
    return (
      <DialogContent>
        <DialogContentText>
          Select the permission set for {agent.isUser ? 'user' : 'client'} <strong>{formatAgent(agent)}</strong>. You
          can only assign a permission set if you have all necessary permissions yourself. On the next screen you will
          be able to select the resource scope for this permission set.
        </DialogContentText>
        <PermissionRoleSelector
          role={role}
          onRoleChange={(role: any) => setRole(role)}
          className={classes.inputField}
          allowSameRole
          autoFocus
          variant="filled"
        />
      </DialogContent>
    );
  }

  const isAccountLevelPermissionSet = () => role.role === 'admin';

  function resourceSelector() {
    if (role.role === sameRole.role) {
      return (
        <DialogContent>
          <DialogContentText>
            The {agent.isUser ? 'user' : 'client'} will be granted the same set of permissions you have. You can review
            them in the next step.
          </DialogContentText>
        </DialogContent>
      );
    } else if (isAccountLevelPermissionSet()) {
      return (
        <DialogContent>
          <DialogContentText>
            Apply the{' '}
            <strong>
              {role.title} - {role.description}
            </strong>{' '}
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
            Apply the{' '}
            <strong>
              {role.title} - {role.description}
            </strong>{' '}
            permission set to:
          </DialogContentText>
          <FunctionResourceSelector resource={resource} onResourceChange={(resource: any) => setResource(resource)} />
        </DialogContent>
      );
    }
  }

  function permissionReview() {
    if (agent.status === 'error') {
      return (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      );
    } else if (agent.status === 'ready' || agent.status === 'updating') {
      return (
        <DialogContent>
          <DialogContentText>
            The following permissions will be granted to {agent.isUser ? 'user' : 'client'}{' '}
            <strong>{formatAgent(agent)}</strong>:
          </DialogContentText>
          {role.role !== sameRole.role && (
            <PermissionsReviewTable actions={rolesHash[role.role].actions} resource={resource} />
          )}
          {role.role === sameRole.role && (
            <PermissionsReviewTable allow={(profile.me && profile.me.access.allow) || []} />
          )}
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
      {activeStep === 0 && agent.status === 'loading' && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      {agent.status === 'error' && (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      )}
      {activeStep === 0 && agent.status === 'ready' && roleSelector()}
      {activeStep === 1 && agent.status === 'ready' && resourceSelector()}
      {activeStep === 2 && agent.status !== 'error' && permissionReview()}
      <DialogActions>
        <Button onClick={() => onClose && onClose()} disabled={agent.status === 'updating'}>
          Cancel
        </Button>
        <Button onClick={handlePreviousStep} disabled={activeStep === 0 || agent.status !== 'ready'}>
          Back
        </Button>
        {activeStep < 2 && (
          <Button
            onClick={handleNextStep}
            color="secondary"
            variant="contained"
            disabled={resource.hasError || agent.status !== 'ready'}
          >
            Next
          </Button>
        )}
        {activeStep === 2 && (
          <Button
            onClick={handleSubmit}
            color="secondary"
            disabled={resource.hasError || agent.status !== 'ready'}
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
