import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import AgentSelector from './AgentSelector';
import { useHistory } from 'react-router-dom';
import { useProfile } from './ProfileProvider';

function GrantPermissionsDialog({ open, onClose, ...rest }: any) {
  const history = useHistory();
  const { profile } = useProfile();
  const [agent, setAgent] = React.useState<any>(null);

  const handleGo = () => {
    if (agent && agent.id) {
      history.push(
        `/accounts/${profile.account}/${agent.id.indexOf('clt-') === 0 ? 'clients' : 'users'}/${agent.id}/permissions`
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose && onClose()}
      fullWidth={true}
      {...rest}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Grant permissions</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Select the user or client you want to grant new permissions to:
        </DialogContentText>
        <AgentSelector
          label="User or client"
          fullWidth
          onSelected={(a: any) => setAgent(a)}
          onInputChange={() => agent && setAgent(null)}
          variant="filled"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose && onClose()} color="primary" variant="text">
          Cancel
        </Button>
        <Button onClick={handleGo} color="secondary" variant="contained" disabled={!!!agent}>
          Go
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GrantPermissionsDialog;
