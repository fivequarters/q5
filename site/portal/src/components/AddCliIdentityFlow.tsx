import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import LinearProgress from '@material-ui/core/LinearProgress';
import Link from '@material-ui/core/Link';
import TextField from '@material-ui/core/TextField';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import React from 'react';
import { getInitToken } from '../lib/Fusebit';
import { useAgent } from './AgentProvider';
import { FusebitError } from './ErrorBoundary';
import PortalError from './PortalError';
import { useProfile } from './ProfileProvider';

function AddCliIdentityFlow({ options, flow, onDone, variant }: any) {
  const { profile } = useProfile();
  const [agent] = useAgent();
  const [initToken, setInitToken] = React.useState();

  if (flow !== 'pki' && flow !== 'oauth-device') {
    throw new Error(`Unsupported flow: ${flow}`);
  }

  if (flow === 'auth0-device' && !agent.isUser) {
    throw new Error("Flow 'oauth-device' is not supported for clients, only users");
  }

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (!initToken) {
      (async () => {
        let data: any;
        const augmentedProfile = {
          ...profile,
          subscription:
            options.subscriptionId && options.subscriptionId !== '*'
              ? options.subscriptionId
              : profile.subscription || undefined,
          boundary: options.boundaryId || profile.boundary || undefined,
          function: options.functionId || profile.function || undefined,
        };
        try {
          data = {
            token: await getInitToken(augmentedProfile, agent.agentId, flow === 'pki' ? 'pki' : 'oauth', agent.isUser),
          };
        } catch (e) {
          data = {
            error: new FusebitError('Error generating CLI initialization command', {
              details:
                (e.status || e.statusCode) === 403
                  ? 'You are not authorized to generate CLI initialization commands'
                  : e.message || 'Unknown error.',
            }),
          };
        }
        if (!cancelled) {
          setInitToken({ ...data });
          onDone && onDone({ ...data });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [
    initToken,
    profile,
    agent.agentId,
    flow,
    agent.isUser,
    options.boundaryId,
    options.functionId,
    options.subscriptionId,
    onDone,
  ]);

  if (!initToken) {
    return (
      <DialogContent>
        <LinearProgress />
      </DialogContent>
    );
  } else if (initToken.error) {
    return (
      <DialogContent>
        <PortalError error={initToken.error} />
      </DialogContent>
    );
  } else {
    const cliInitCommand = `fuse init ${initToken.token}`;
    return (
      <DialogContent>
        <DialogContentText>
          Have the {agent.isUser ? 'user' : 'client'}{' '}
          <Link target="_blank" color="secondary" href="https://fusebit.io/docs/integrator-guide/getting-started/">
            install the Fusebit CLI <OpenInNewIcon fontSize="inherit" />
          </Link>{' '}
          and share the following initialization command with them through a secure channel. The one-time initialization
          token in the command is valid for eight hours.
        </DialogContentText>
        <TextField
          margin="dense"
          variant={variant || 'filled'}
          value={cliInitCommand}
          fullWidth
          disabled={true}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => navigator.clipboard.writeText(cliInitCommand)} color="inherit">
                  <FileCopyIcon fontSize="inherit" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </DialogContent>
    );
  }
}

export default AddCliIdentityFlow;
