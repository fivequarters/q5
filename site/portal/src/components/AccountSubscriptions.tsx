import React from 'react';
import ProgressView from './ProgressView';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import PortalError from './PortalError';
import Link from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import { useSubscriptions } from './SubscriptionsProvider';

interface ViewRow {
  name: string;
  id: string;
  // functions: string;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function AccountSubscriptions() {
  const [subscriptions] = useSubscriptions();
  // const { params } = match;

  const createViewRow = (dataRow: any): ViewRow => ({
    name: dataRow.displayName || 'N/A',
    id: dataRow.id as string,
    // functions: "N/A",
    // firstExecuted: "N/A",
    // lastExecuted: "N/A",
    // errorsLast24h: "N/A",
    // executionsLast24h: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: 'name',
      // disablePadding: true,
      align: 'left',
      label: 'Subscription Name',
      render: (row) => (
        <Link component={RouterLink} to={`subscriptions/${row.id}/boundaries`}>
          {row.name}
        </Link>
      ),
    },
    {
      id: 'id',
      align: 'left',
      label: 'Subscription ID',
    },
    // {
    //   id: "functions",
    //   label: "Functions"
    // },
    // {
    //   id: "firstExecuted",
    //   label: "First Executed"
    // },
    // {
    //   id: "lastExecuted",
    //   label: "Last Executed"
    // },
    // {
    //   id: "errorsLast24h",
    //   label: "Errors (last 24h)"
    // },
    // {
    //   id: "executionsLast24h",
    //   label: "Executions (last 24h)"
    // }
  ];

  if (subscriptions.status === 'loading') {
    return <ProgressView />;
  }

  if (subscriptions.status === 'error') {
    return <PortalError error={subscriptions.error} padding={true} />;
  }

  const viewData = subscriptions.existing.list.map(createViewRow);

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="name"
      identityKey="id"
      title="Subscriptions"
      size="narrow"
    />
  );
}

export default AccountSubscriptions;
