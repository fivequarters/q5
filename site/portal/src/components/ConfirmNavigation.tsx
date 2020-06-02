import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import React from 'react';
import { Prompt, useHistory } from 'react-router-dom';

function ConfirmNavigation({ title, text }: any) {
  const history = useHistory();
  const [confirmation, setConfirmation] = React.useState<any>({
    open: false,
    location: undefined,
  });

  const handleConfirmation = (confirmed: boolean) => {
    // console.log("CONFIRMATION", confirmed, confirmation);
    if (confirmed) {
      history.push(confirmation.location);
    } else {
      setConfirmation({ open: false });
    }
  };

  const handleRouterPrompt = (location: any) => {
    // console.log("HANDLE ROUTER PROMPT", location);
    setConfirmation({ location, open: true });
    return false;
  };

  return (
    //@ts-ignore
    <div>
      <Prompt when={!confirmation.open} message={handleRouterPrompt} />
      <Dialog
        open={confirmation.open}
        onClose={() => handleConfirmation(false)}
        aria-labelledby="form-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="form-dialog-title">{title || 'Discard changes?'}</DialogTitle>
        <DialogContent>
          {text || 'You have unsaved changes. Do you want to navigate away from this page and discard them?'}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmation(false)}>Cancel</Button>
          <Button onClick={() => handleConfirmation(true)} color="secondary">
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default ConfirmNavigation;
