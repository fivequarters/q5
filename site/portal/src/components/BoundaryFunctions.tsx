import React from 'react';
import ProgressView from './ProgressView';
import DialogContentText from '@material-ui/core/DialogContentText';
import ExplorerTable, { HeadCell } from './ExplorerTable';
import PortalError from './PortalError';
import Link from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import { useBoundaries, reloadBoundaries } from './BoundariesProvider';
import ActionButton from './ActionButton';
import { deleteFunctions } from '../lib/Fusebit';
import { useProfile } from './ProfileProvider';
import { FusebitError } from './ErrorBoundary';

interface ViewRow {
  id: string;
  // firstExecuted: string;
  // lastExecuted: string;
  // errorsLast24h: string;
  // executionsLast24h: string;
}

function BoundaryFunctions({ boundaryId, subscriptionId }: any) {
  const { profile } = useProfile();
  const [boundaries, setBoundaries] = useBoundaries();

  const createViewRow = (dataRow: any): ViewRow => ({
    id: dataRow.functionId as string,
    // firstExecuted: "N/A",
    // lastExecuted: "N/A",
    // errorsLast24h: "N/A",
    // executionsLast24h: "N/A"
  });

  const headCells: HeadCell<ViewRow>[] = [
    {
      id: 'id',
      // disablePadding: true,
      align: 'left',
      label: 'Function Name',
      render: row => (
        <Link component={RouterLink} to={`functions/${row.id}/properties`}>
          {row.id}
        </Link>
      ),
    },
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

  if (boundaries.status === 'loading') {
    return <ProgressView />;
  }

  if (boundaries.status === 'error') {
    return <PortalError error={boundaries.error} padding={true} />;
  }

  const viewData = ((boundaries.existing[boundaryId] && boundaries.existing[boundaryId].functions) || []).map(
    createViewRow
  );

  const handleDelete = async (selected: string[]) => {
    try {
      await deleteFunctions(profile, subscriptionId, boundaryId, selected);
    } catch (e) {
      setBoundaries({
        status: 'error',
        error: new FusebitError('Error deleting functions', {
          details:
            (e.status || e.statusCode) === 403
              ? 'You are not authorized to delete one or more of the selected functions.'
              : e.message || 'Unknown error.',
          actions: [
            {
              text: 'Back to functions',
              func: () => reloadBoundaries(boundaries, setBoundaries),
            },
          ],
        }),
      });
      return;
    }
    reloadBoundaries(boundaries, setBoundaries);
  };

  const generateDeleteContent = (selected: string[]) => {
    return (
      <div>
        <DialogContentText>
          {selected.length > 1
            ? `You are about to delete ${selected.length} functions.`
            : `You are about to delete the selected function.`}
        </DialogContentText>
      </div>
    );
  };

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="id"
      identityKey="id"
      title="Functions"
      size="narrow"
      enableSelection={true}
      onDelete={handleDelete}
      deleteTitle={selected => (selected.length > 1 ? `Delete ${selected.length} functions?` : 'Delete the function?')}
      deleteContent={generateDeleteContent}
      actions={
        <ActionButton to="new-function" component={RouterLink}>
          New&nbsp;function
        </ActionButton>
      }
    />
  );
}

export default BoundaryFunctions;
