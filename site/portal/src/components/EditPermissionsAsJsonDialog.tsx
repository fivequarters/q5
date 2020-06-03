import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import LinearProgress from '@material-ui/core/LinearProgress';
import TextField from '@material-ui/core/TextField';
import React from 'react';
import { modifyAgent, saveAgent, useAgent } from './AgentProvider';
import PortalError from './PortalError';

function EditPermissionsAsJsonDialog({ onClose }: any) {
  const [agent, setAgent] = useAgent();
  const [data, setData] = React.useState<any>({
    permissionsSerialized: JSON.stringify(
      (agent.status === 'ready' && agent.modified.access && agent.modified.access.allow) || [],
      null,
      2
    ),
    permissionError: undefined,
  });

  const formatHint =
    "Permissions must be a JSON array of objects, each with 'action' and 'resource' string properties.";

  const handlePermissionsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let data: any = { permissionsSerialized: event.target.value };
    let allow: any;
    try {
      allow = JSON.parse(data.permissionsSerialized);
      delete data.permissionsError;
    } catch (e) {
      data.permissionsError = `Input is not a valid JSON. ${formatHint}`;
    }
    if (!data.permissionsError) {
      if (!Array.isArray(allow)) {
        data.permissionsError = `Input is not a JSON array. ${formatHint}`;
      } else {
        const validatePermission = (p: any): string | undefined => {
          if (typeof p !== 'object' || !p) {
            return `Array element is not an object. ${formatHint}`;
          } else if (p.action === undefined) {
            return `Permission is missing the 'action' property. ${formatHint}`;
          } else if (typeof p.action !== 'string') {
            return `The 'action' property is not a string. ${formatHint}`;
          } else if (p.resource === undefined) {
            return `Permission is missing the 'resource' property. ${formatHint}`;
          } else if (typeof p.resource !== 'string') {
            return `The 'resource' property is not a string. ${formatHint}`;
          }
          return undefined;
        };

        data.permissionsError = allow.reduce<string | undefined>(
          (error, current) => error || validatePermission(current),
          undefined
        );
      }
    }
    setData({ ...data });
  };

  const hasError = () => !!data.permissionsError;

  const handleSubmit = async () => {
    if (agent.status === 'ready') {
      const allow = JSON.parse(data.permissionsSerialized).map((p: any) => ({
        action: p.action,
        resource: p.resource,
      }));

      agent.modified.access = { allow };
      modifyAgent(agent, setAgent, { ...agent.modified });
      saveAgent(agent, setAgent, undefined, e => !e && onClose && onClose());
    }
  };

  return (
    <Dialog
      open={true}
      onClose={() => agent.status === 'ready' && onClose && onClose(false)}
      aria-labelledby="form-dialog-title"
      maxWidth="md"
      fullWidth
      // classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title">Edit {agent.isUser ? 'user' : 'client'} permissions</DialogTitle>
      {(agent.status === 'ready' || agent.status === 'updating') && (
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="permissions"
            label="Permissions"
            variant="filled"
            helperText={
              data.permissionsError || "A JSON array of objects, each with 'action' and 'resource' string properties."
            }
            fullWidth
            multiline
            rows={14}
            error={hasError()}
            value={data.permissionsSerialized}
            onChange={handlePermissionsChange}
            disabled={agent.status !== 'ready'}
          />
        </DialogContent>
      )}
      {agent.status === 'error' && (
        <DialogContent>
          <PortalError error={agent.error} />
        </DialogContent>
      )}
      {agent.status === 'loading' && (
        <DialogContent>
          <LinearProgress />
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={() => onClose && onClose()} disabled={agent.status === 'updating'}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="secondary"
          variant="contained"
          disabled={agent.status !== 'ready' || hasError()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditPermissionsAsJsonDialog;
