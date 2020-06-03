import React from 'react';
import { useProfile } from './ProfileProvider';
import ProgressView from './ProgressView';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import { User, Client, Permission, Resource } from '../lib/FusebitTypes';
import PortalError from './PortalError';
import UserAvatar from './UserAvatar';
import Link from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
// import ActionButton from "./ActionButton";
import { IFusebitProfile } from '../lib/Settings';
import { useAgents } from './AgentsProvider';
import { tryTokenizeResource } from '../lib/Actions';
import FunctionResourceCrumb from './FunctionResourceCrumb';
import { makeStyles } from '@material-ui/core/styles';
// import AgentSelector from "./AgentSelector";
// import { useHistory } from "react-router-dom";
// import { formatAgent } from "../lib/Fusebit";
import ActionButton from './ActionButton';
import GrantPermissionsDialog from './GrantPermissionsDialog';

const useStyles = makeStyles((theme: any) => ({
  agentName: {
    marginTop: -theme.spacing(1),
  },
  agentPicker: {
    display: 'inline-flex',
    marginLeft: theme.spacing(15),
    width: theme.spacing(40),
    minWidth: theme.spacing(40),
  },
}));

interface ViewRow {
  name: string;
  type: string;
  id: string;
  permissions: Permission[];
  action?: string;
  resource?: string;
}

function sortPermissions(permissions: Permission[]) {
  permissions.sort((a, b) =>
    a.action < b.action ? -1 : a.action > b.action ? 1 : a.resource.length - b.resource.length
  );
  return permissions;
}

const createViewRow = (profile: IFusebitProfile) => (dataRow: any): ViewRow => ({
  name: `${[dataRow.firstName, dataRow.lastName, dataRow.displayName].join(' ').trim() || 'N/A'}${
    profile.me && profile.me.id === dataRow.id ? ' (you)' : ''
  }`,
  type: (dataRow.id as string).indexOf('clt-') === 0 ? 'Client' : 'User',
  id: dataRow.id as string,
  permissions: sortPermissions((dataRow.access && dataRow.access.allow) || []),
  action: undefined,
  resource: undefined,
});

type ResourceAccessProps = {
  actionPrefixFilter: string[];
  resourceFilter: Resource;
};

const getActionRowSpan = (row: ViewRow, tableRow: number): number => {
  if (tableRow > 0 && row.permissions[tableRow - 1].action === row.permissions[tableRow].action) {
    return 0;
  }
  let rowSpan = 1;
  while (
    row.permissions[tableRow + rowSpan] &&
    row.permissions[tableRow + rowSpan].action === row.permissions[tableRow].action
  ) {
    rowSpan++;
  }
  return rowSpan;
};

function ResourceAccess({ actionPrefixFilter, resourceFilter }: ResourceAccessProps) {
  const { profile } = useProfile();
  const [agents] = useAgents();
  // const [agentFilter, setAgentFilter] = React.useState(null);
  const [grantPermissionsDialogOpen, setGrantPermissionsDialogOpen] = React.useState(false);
  const classes = useStyles();
  // const history = useHistory();

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: 'name',
      // disablePadding: true,
      align: 'left',
      label: 'Name',
      render: (row, tableRow) =>
        tableRow === 0 ? (
          <div className={classes.agentName}>
            <Link
              component={RouterLink}
              to={`/accounts/${profile.account}/${row.id.indexOf('clt-') === 0 ? 'clients' : 'users'}/${
                row.id
              }/permissions`}
            >
              <UserAvatar letter={row.name[0]} />
              {row.name}
            </Link>
          </div>
        ) : (
          undefined
        ),
      getRowSpan: row => row.permissions.length || 1,
    },
    {
      id: 'type',
      align: 'left',
      label: 'Type',
      render: (row, tableRow) => (tableRow === 0 ? row.type : undefined),
      getRowSpan: (row, tableRow) => (tableRow === 0 ? row.permissions.length || 1 : 0),
    },
    {
      id: 'action',
      align: 'left',
      disableSorting: true,
      label: 'Action',
      render: (row, tableRow) =>
        row.permissions[tableRow - 1] && row.permissions[tableRow - 1].action === row.permissions[tableRow].action ? (
          undefined
        ) : (
          <strong>{row.permissions[tableRow].action}</strong>
        ),
      getRowSpan: getActionRowSpan,
    },
    {
      id: 'resource',
      align: 'left',
      disableSorting: true,
      label: 'Resource',
      render: (row, tableRow) =>
        (row.permissions[tableRow] && row.permissions[tableRow].resource && (
          <FunctionResourceCrumb options={tryTokenizeResource(row.permissions[tableRow].resource)} />
        )) ||
        'N/A',
    },
  ];

  if (agents.status === 'loading') {
    return <ProgressView />;
  }

  if (agents.status === 'error') {
    return <PortalError error={agents.error} padding={true} />;
  }

  // Select users and clients that have permissions matching the permission filter
  const createViewRowImpl = createViewRow(profile);
  const viewData = (agents.existing as (User | Client)[]).reduce((previous: ViewRow[], current: User | Client) => {
    // if (agentFilter) {
    //   const agentName = formatAgent(current);
    //   if (agentName.indexOf((agentFilter as unknown) as string) === -1) {
    //     return previous;
    //   }
    // }
    const matchingPermissions: Permission[] = [];
    ((current.access && current.access.allow) || []).forEach(permission => {
      if (permission.action === '*' || actionPrefixFilter.indexOf(permission.action.split(':')[0]) > -1) {
        const resource = tryTokenizeResource(permission.resource) as any;
        for (var resourceComponent in resourceFilter) {
          if (
            resource[resourceComponent] !== undefined &&
            resource[resourceComponent] !== (resourceFilter as any)[resourceComponent]
          ) {
            return;
          }
        }
        matchingPermissions.push(permission);
      }
    });
    if (matchingPermissions.length > 0) {
      previous.push(
        createViewRowImpl({
          ...current,
          ...{ access: { allow: matchingPermissions } },
        })
      );
    }
    return previous;
  }, []);

  // const handleAgentSelected = (agent: User | Client) => {
  //   history.push(
  //     `/accounts/${profile.account}/${
  //       agent.id.indexOf("clt-") === 0 ? "clients" : "users"
  //     }/${agent.id}/permissions`
  //   );
  // };

  // const handleAgentFilterChange = (filter: any) => setAgentFilter(filter);

  return (
    <React.Fragment>
      <ExplorerTable<ViewRow>
        rows={viewData}
        headCells={headCells}
        getTableRows={row => row.permissions.length}
        defaultSortKey="name"
        identityKey="id"
        title="Access"
        enableSelection={false}
        actions={
          <ActionButton onClick={() => setGrantPermissionsDialogOpen(true)}>Grant&nbsp;permissions</ActionButton>
        }
        // actions={
        //   <AgentSelector
        //     label="Go to any user or client"
        //     className={classes.agentPicker}
        //     onSelected={handleAgentSelected}
        //     onInputChange={handleAgentFilterChange}
        //   />
        // }
      />
      {grantPermissionsDialogOpen && (
        <GrantPermissionsDialog open={true} onClose={() => setGrantPermissionsDialogOpen(false)} />
      )}
    </React.Fragment>
  );
}

export default ResourceAccess;
