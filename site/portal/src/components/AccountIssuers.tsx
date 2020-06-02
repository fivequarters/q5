import React from 'react';
import { useProfile } from './ProfileProvider';
import { makeStyles } from '@material-ui/core/styles';
import ProgressView from './ProgressView';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import { deleteIssuers } from '../lib/Fusebit';
import { FusebitError } from './ErrorBoundary';
import PortalError from './PortalError';
import IssuerAvatar from './IssuerAvatar';
import Link from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import DialogContentText from '@material-ui/core/DialogContentText';
import Typography from '@material-ui/core/Typography';
import NewIssuer from './NewIssuer';
import ActionButton from './ActionButton';
import { useIssuers, removeIssuers, reloadIssuers } from './IssuersProvider';

interface ViewRow {
  name: string;
  id: string;
  keyAcquisition: 'Stored Public Key' | 'JWKS Endpoint';
  // firstUsed: string;
  // lastUsed: string;
}

const useStyles = makeStyles(theme => ({
  link: {
    display: 'inline-flex',
    alignItems: 'center',
  },
}));

function AccountIssuers() {
  const { profile } = useProfile();
  const [issuers, setIssuers] = useIssuers();
  const classes = useStyles();
  const [newIssuerOpen, setNewIssuerOpen] = React.useState(false);
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: dataRow.displayName || 'N/A',
    id: dataRow.id as string,
    keyAcquisition: dataRow.jsonKeysUrl ? 'JWKS Endpoint' : 'Stored Public Key',
    // firstUsed: "N/A",
    // lastUsed: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: 'name',
      disablePadding: true,
      align: 'left',
      label: 'Name',
      render: row => (
        <Link component={RouterLink} to={`issuers/${encodeURIComponent(row.id)}/properties`} className={classes.link}>
          <IssuerAvatar id={row.id} />
          {row.name}
        </Link>
      ),
    },
    {
      id: 'keyAcquisition',
      align: 'left',
      label: 'Public Key Acquisition',
    },
    {
      id: 'id',
      align: 'left',
      label: 'Issuer ID',
    },
    // {
    //   id: "firstUsed",
    //   label: "First Used",
    //   align: "left"
    // },
    // {
    //   id: "lastUsed",
    //   label: "Last Used",
    //   align: "left"
    // }
  ];

  if (issuers.status === 'loading') {
    return <ProgressView />;
  }

  if (issuers.status === 'error') {
    return <PortalError error={issuers.error} padding={true} />;
  }

  const handleDelete = async (selected: string[]) => {
    try {
      await deleteIssuers(profile, selected);
    } catch (e) {
      setIssuers({
        status: 'error',
        error: new FusebitError('Error deleting issuers', {
          details:
            (e.status || e.statusCode) === 403
              ? 'You are not authorized to delete issuers in this account.'
              : e.message || 'Unknown error.',
          actions: [
            {
              text: 'Back to issuers',
              func: () => reloadIssuers(issuers, setIssuers),
            },
          ],
        }),
      });
      return;
    }
    removeIssuers(issuers, setIssuers, selected);
  };

  const generateDeleteContent = (selected: string[]) => {
    const deletingCurrentUsersIssuer =
      (profile.me &&
        profile.me.identities.reduce(
          (match: boolean, identity: { issuerId: string; subject: string }) =>
            match || selected.indexOf(identity.issuerId) > -1,
          false
        )) ||
      false;
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} issuers.`
            : `You are about to delete the selected issuer.`}
        </DialogContentText>
        {deletingCurrentUsersIssuer && selected.length > 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              One of the issuers you are about to delete enables you to log in. If you continue, you may loose access to
              the portal.
            </DialogContentText>
          </React.Fragment>
        )}
        {deletingCurrentUsersIssuer && selected.length === 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              The issuer you are about to delete enables you to log in. If you continue, you may loose access to the
              portal.
            </DialogContentText>
          </React.Fragment>
        )}
      </div>
    );
  };

  const handleAddIssuer = (added: boolean) => {
    setNewIssuerOpen(false);
    if (added) {
      reloadIssuers(issuers, setIssuers);
    }
  };

  const viewData = issuers.existing.map(createViewRow);

  return (
    <React.Fragment>
      <ExplorerTable<ViewRow>
        rows={viewData}
        headCells={headCells}
        defaultSortKey="name"
        identityKey="id"
        title="Issuers"
        enableSelection={true}
        onDelete={handleDelete}
        deleteTitle={selected => (selected.length > 1 ? 'Delete issuers?' : 'Delete issuer?')}
        deleteContent={generateDeleteContent}
        actions={<ActionButton onClick={() => setNewIssuerOpen(true)}>Add&nbsp;issuer</ActionButton>}
      />
      {newIssuerOpen && <NewIssuer onClose={handleAddIssuer} />}
    </React.Fragment>
  );
}

export default AccountIssuers;
