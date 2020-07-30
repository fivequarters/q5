import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import LinearProgress from '@material-ui/core/LinearProgress';
import DialogTitle from '@material-ui/core/DialogTitle';
import React from 'react';
import { useLocation, useHistory, Link as RouterLink } from 'react-router-dom';
import PortalError from './PortalError';
import Superagent from 'superagent';
import { useProfile } from './ProfileProvider';
import { useCatalog } from './CatalogProvider';
import { ensureAccessToken, appendUrlSegment, userAgent } from '../lib/Fusebit';
import { useBoundaries, reloadBoundaries } from './BoundariesProvider';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

type NewFunctionCreateProps = {
  subscriptionId: string;
  boundaryId?: string;
  templateId: string;
};

function NewFunctionCreate({ subscriptionId, boundaryId, templateId }: NewFunctionCreateProps) {
  const { profile } = useProfile();
  const [catalog] = useCatalog();
  const history = useHistory();
  const query = useQuery();
  const status = query.get('status');
  const data = query.get('data') ? JSON.parse(Buffer.from(query.get('data') as string, 'base64').toString()) : {};
  const [state, setState] = React.useState<any>(
    status === 'success'
      ? { status: 'installing' }
      : {
          status: 'error',
          error: new Error(data.message || 'Unspecified error'),
        }
  );
  const [boundaries, setBoundaries] = useBoundaries();

  React.useEffect(() => {
    let cancelled: boolean = false;
    if (state.status === 'installing' && catalog.status === 'ready' && boundaries.status === 'ready') {
      (async () => {
        try {
          const template = catalog.existing.templates.find(t => t.id === templateId);
          if (!template) {
            throw new Error(`Unsupported function template '${templateId}'.`);
          }
          const { baseUrl, accountId, subscriptionId, boundaryId, functionId } = data;
          delete data.baseUrl;
          delete data.accountId;
          delete data.subscriptionId;
          delete data.boundaryId;
          delete data.functionId;
          delete data.templateName;
          await Superagent.post(appendUrlSegment(template.managerUrl, 'install'))
            .set('Authorization', `Bearer ${(await ensureAccessToken(profile)).access_token}`)
            .set('x-user-agent', userAgent)
            .send({
              baseUrl,
              accountId,
              subscriptionId,
              boundaryId,
              functionId,
              configuration: data,
              metadata: { template },
            });
          if (!cancelled) {
            setState({ status: 'success' });
            if (boundaries.status === 'ready') {
              reloadBoundaries(boundaries, setBoundaries);
            }
          }
        } catch (error) {
          !cancelled && setState({ status: 'error', error });
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [state, data, profile, catalog, templateId, boundaries, setBoundaries]);

  const doneUrl =
    state.status === 'success'
      ? `/accounts/${data.accountId}/subscriptions/${data.subscriptionId}/boundaries/${data.boundaryId}/functions/${data.functionId}/properties`
      : `/accounts/${profile.account}/subscriptions/${subscriptionId}${
          boundaryId ? '/boundaries/' + boundaryId : ''
        }/new-function`;

  const handleClose = () => {
    history.push(doneUrl);
  };

  return (
    <Dialog open={true} onClose={handleClose} maxWidth="sm" fullWidth>
      {(catalog.status === 'loading' || (catalog.status === 'ready' && state.status === 'installing')) && (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">
            Creating <strong>{data.templateName}</strong>
          </DialogTitle>
          <DialogContent>
            <LinearProgress />
          </DialogContent>
        </React.Fragment>
      )}
      {(catalog.status === 'error' || state.status === 'error') && (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">
            Error creating <strong>{data.templateName}</strong>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Error creating function <strong>{data.functionId}</strong> in <strong>{data.boundaryId}</strong> boundary
              using <strong>{data.templateName}</strong> template.
            </DialogContentText>
            <PortalError error={(catalog.status === 'error' && catalog.error) || state.error} />
          </DialogContent>
        </React.Fragment>
      )}
      {state.status === 'success' && (
        <React.Fragment>
          <DialogTitle id="form-dialog-title">
            Creating <strong>{data.templateName}</strong>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Function <strong>{data.functionId}</strong> created successfuly in <strong>{data.boundaryId}</strong>{' '}
              boundary using <strong>{data.templateName}</strong> template.
            </DialogContentText>
          </DialogContent>
        </React.Fragment>
      )}
      <DialogActions>
        <Button
          to={doneUrl}
          component={RouterLink}
          variant="contained"
          color="primary"
          disabled={state.status === 'installing' || catalog.status === 'loading'}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NewFunctionCreate;
