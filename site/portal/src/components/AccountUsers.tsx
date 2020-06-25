import React from 'react';
import { useProfile } from './ProfileProvider';
import ProgressView from './ProgressView';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import { deleteUsers } from '../lib/Fusebit';
import { User } from '../lib/FusebitTypes';
import { FusebitError } from './ErrorBoundary';
import PortalError from './PortalError';
import UserAvatar from './UserAvatar';
import Link from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import DialogContentText from '@material-ui/core/DialogContentText';
import Typography from '@material-ui/core/Typography';
import ActionButton from './ActionButton';
import { IFusebitProfile } from '../lib/Settings';
import { useAgents, removeAgents, reloadAgents } from './AgentsProvider';

interface ViewRow {
  name: string;
  email: string;
  id: string;
  identities: number;
  permissions: number;
}

const createViewRow = (profile: IFusebitProfile) => (dataRow: any): ViewRow => ({
  name: `${[dataRow.firstName, dataRow.lastName].join(' ').trim() || 'N/A'}${
    profile.me && profile.me.id === dataRow.id ? ' (you)' : ''
  }`,
  email: dataRow.primaryEmail || 'N/A',
  id: dataRow.id as string,
  identities: (dataRow.identities && dataRow.identities.length) || 0,
  permissions: (dataRow.access && dataRow.access.allow && dataRow.access.allow.length) || 0,
});

function AccountUsers() {
  const { profile } = useProfile();
  const [agents, setAgents] = useAgents();
  // const { params } = match;

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: 'name',
      disablePadding: true,
      align: 'left',
      label: 'Name',
      render: (row) => (
        <Link component={RouterLink} to={`users/${row.id}/properties`}>
          <UserAvatar letter={row.name[0]} />
          {row.name}
        </Link>
      ),
    },
    {
      id: 'email',
      align: 'left',
      label: 'Email',
    },
    {
      id: 'id',
      align: 'left',
      label: 'User ID',
    },
    {
      id: 'identities',
      label: 'Identities',
    },
    {
      id: 'permissions',
      label: 'Permissions',
    },
  ];

  if (agents.status === 'loading') {
    return <ProgressView />;
  }

  if (agents.status === 'error') {
    return <PortalError error={agents.error} padding={true} />;
  }

  const handleDelete = async (selected: string[]) => {
    try {
      await deleteUsers(profile, selected);
    } catch (e) {
      setAgents({
        status: 'error',
        agentType: agents.agentType,
        error: new FusebitError('Error deleting users', {
          details:
            (e.status || e.statusCode) === 403
              ? 'You are not authorized to delete users in this account.'
              : e.message || 'Unknown error.',
          actions: [
            {
              text: 'Back to users',
              func: () => reloadAgents(agents, setAgents),
            },
          ],
        }),
      });
      return;
    }
    removeAgents(agents, setAgents, selected);
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} users.`
            : `You are about to delete the selected user.`}
        </DialogContentText>
        {selected.indexOf((profile.me && profile.me.id) || '') > -1 && selected.length > 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              One of the users you are about to delete is you. If you continue, you may loose access to the portal.
            </DialogContentText>
          </React.Fragment>
        )}
        {selected.indexOf((profile.me && profile.me.id) || '') > -1 && selected.length === 1 && (
          <React.Fragment>
            <Typography color="primary">WARNING</Typography>
            <DialogContentText>
              The user you are about to delete is you. If you continue, you may loose access to the portal.
            </DialogContentText>
          </React.Fragment>
        )}
      </div>
    );
  };

  const viewData = (agents.existing as User[]).map(createViewRow(profile));

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Users"
      enableSelection={true}
      onDelete={handleDelete}
      deleteTitle={(selected) => (selected.length > 1 ? 'Delete users?' : 'Delete user?')}
      deleteContent={generateDeleteContent}
      actions={
        <ActionButton to="users/new" component={RouterLink}>
          New&nbsp;user
        </ActionButton>
      }
    />
  );
}

export default AccountUsers;
